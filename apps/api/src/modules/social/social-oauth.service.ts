import { createHash, randomBytes } from 'node:crypto';

import axios from 'axios';
import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import { inject, injectable } from 'tsyringe';

import { ServiceUnavailableError, UnauthorizedError, ValidationError } from '../../common/errors.js';
import type { AppConfig } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';
import { TokenCrypto } from '../../providers/social/token-crypto.js';
import { TOKENS } from '../../tokens.js';

import type { SocialAccountDocument, SocialPlatform } from './social-account.model.js';
import { SocialAccountRepository } from './social-account.repository.js';

export const OAUTH_STATE_COOKIE = 'iaa_social_oauth_state';

const STATE_TTL_SECONDS = 600;
const GRAPH_VERSION = 'v20.0';

interface OAuthStatePayload {
  state: string;
  userId: string;
  platform: SocialPlatform;
  verifier?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

const parseCookies = (header: string | undefined): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  }
  return cookies;
};

const base64Url = (buffer: Buffer): string =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const generatePkceVerifier = (): string => base64Url(randomBytes(32));

const pkceChallenge = (verifier: string): string =>
  base64Url(createHash('sha256').update(verifier).digest());

/**
 * Handles OAuth 2.0 connect/callback flows and token refresh for the
 * supported social platforms. Tokens are encrypted at rest via TokenCrypto.
 */
@injectable()
export class SocialOAuthService {
  constructor(
    @inject(TOKENS.Config) private readonly config: AppConfig,
    @inject(TOKENS.Logger) private readonly logger: AppLogger,
    @inject(SocialAccountRepository) private readonly repository: SocialAccountRepository,
    @inject(TokenCrypto) private readonly crypto: TokenCrypto,
  ) {}

  private get redirectBase(): string {
    const base = this.config.social.oauthRedirectBase;
    if (!base) {
      throw new ServiceUnavailableError('SOCIAL_OAUTH_REDIRECT_BASE is not configured');
    }
    return base.replace(/\/$/, '');
  }

  private getCredentials(platform: SocialPlatform): { clientId: string; clientSecret: string } {
    const social = this.config.social;
    let creds: { clientId?: string; clientSecret?: string };
    if (platform === 'linkedin') {
      creds = { clientId: social.linkedin.clientId, clientSecret: social.linkedin.clientSecret };
    } else if (platform === 'meta') {
      creds = { clientId: social.meta.appId, clientSecret: social.meta.appSecret };
    } else if (platform === 'threads') {
      // Its own app even though Meta owns it, so its own credentials.
      creds = { clientId: social.threads.appId, clientSecret: social.threads.appSecret };
    } else {
      creds = { clientId: social.x.clientId, clientSecret: social.x.clientSecret };
    }

    if (!creds.clientId || !creds.clientSecret) {
      throw new ServiceUnavailableError(`${platform} OAuth client credentials are not configured`);
    }
    return { clientId: creds.clientId, clientSecret: creds.clientSecret };
  }

  buildAuthorizationUrl(platform: SocialPlatform, userId: string): {
    redirectUrl: string;
    cookie: { name: string; value: string; options: CookieOptions };
  } {
    const { clientId } = this.getCredentials(platform);
    const redirectUri = `${this.redirectBase}/api/social/${platform}/callback`;
    const state = randomBytes(16).toString('hex');
    const payload: OAuthStatePayload = { state, userId, platform };

    let verifier: string | undefined;
    if (platform === 'x') {
      verifier = generatePkceVerifier();
      payload.verifier = verifier;
    }

    const cookieValue = jwt.sign(payload, this.config.jwt.accessSecret, {
      algorithm: 'HS256',
      expiresIn: STATE_TTL_SECONDS,
    });

    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      maxAge: STATE_TTL_SECONDS * 1000,
      path: '/',
    };

    let authorizeUrl: string;
    if (platform === 'linkedin') {
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: 'openid profile email w_member_social',
      });
      authorizeUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    } else if (platform === 'meta') {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
      });
      authorizeUrl = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
    } else if (platform === 'threads') {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        scope: 'threads_basic,threads_content_publish',
      });
      authorizeUrl = `https://threads.net/oauth/authorize?${params.toString()}`;
    } else {
      const challenge = pkceChallenge(verifier!);
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'tweet.read tweet.write users.read offline.access',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      authorizeUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    }

    return {
      redirectUrl: authorizeUrl,
      cookie: { name: OAUTH_STATE_COOKIE, value: cookieValue, options: cookieOptions },
    };
  }

  async handleCallback(
    platform: SocialPlatform,
    query: { code?: string; state?: string },
    cookieHeader?: string,
  ): Promise<SocialAccountDocument> {
    const code = query.code;
    const state = query.state;
    if (!code || !state) {
      throw new ValidationError('Missing OAuth code or state');
    }

    const cookies = parseCookies(cookieHeader);
    const stateCookie = cookies[OAUTH_STATE_COOKIE];
    if (!stateCookie) {
      throw new UnauthorizedError('Missing OAuth state cookie');
    }

    let payload: OAuthStatePayload;
    try {
      const decoded = jwt.verify(stateCookie, this.config.jwt.accessSecret, {
        algorithms: ['HS256'],
      });
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid OAuth state cookie');
      }
      payload = decoded as OAuthStatePayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired OAuth state cookie');
    }

    if (payload.platform !== platform || payload.state !== state) {
      throw new UnauthorizedError('OAuth state mismatch');
    }

    const redirectUri = `${this.redirectBase}/api/social/${platform}/callback`;

    let account: SocialAccountDocument;
    if (platform === 'linkedin') {
      account = await this.handleLinkedInCallback(code, redirectUri, payload.userId);
    } else if (platform === 'meta') {
      account = await this.handleMetaCallback(code, redirectUri, payload.userId);
    } else if (platform === 'threads') {
      account = await this.handleThreadsCallback(code, redirectUri, payload.userId);
    } else {
      if (!payload.verifier) {
        throw new UnauthorizedError('Missing PKCE verifier');
      }
      account = await this.handleXCallback(code, redirectUri, payload.verifier, payload.userId);
    }

    return account;
  }

  /**
   * Returns a usable access token for the platform, refreshing it first if
   * the stored token is expired and a refresh token is available.
   */
  async getValidAccessToken(
    platform: SocialPlatform,
  ): Promise<{ accessToken: string; account: SocialAccountDocument } | null> {
    const account = await this.repository.findByPlatform(platform);
    if (!account) {
      return null;
    }

    const now = Date.now();
    const expired = account.tokenExpiry ? account.tokenExpiry.getTime() <= now : false;

    if (!expired) {
      return { accessToken: this.crypto.decrypt(account.accessToken), account };
    }

    if (!account.refreshToken) {
      this.logger.warn({ platform }, 'Social access token expired and no refresh token is available');
      return null;
    }

    try {
      const refreshed = await this.refreshAccessToken(platform, account);
      return refreshed;
    } catch (err) {
      this.logger.error({ err, platform }, 'Failed to refresh social access token');
      return null;
    }
  }

  private async refreshAccessToken(
    platform: SocialPlatform,
    account: SocialAccountDocument,
  ): Promise<{ accessToken: string; account: SocialAccountDocument }> {
    const refreshToken = this.crypto.decrypt(account.refreshToken!);
    const { clientId, clientSecret } = this.getCredentials(platform);

    let tokenResponse: TokenResponse;
    if (platform === 'linkedin') {
      const response = await axios.post<TokenResponse>(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      tokenResponse = response.data;
    } else if (platform === 'x') {
      const response = await axios.post<TokenResponse>(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );
      tokenResponse = response.data;
    } else {
      throw new ServiceUnavailableError('Meta token refresh is not supported; reconnect the account');
    }

    const updates: Partial<SocialAccountDocument> = {
      accessToken: this.crypto.encrypt(tokenResponse.access_token),
      tokenExpiry: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000)
        : undefined,
    };
    if (tokenResponse.refresh_token) {
      updates.refreshToken = this.crypto.encrypt(tokenResponse.refresh_token);
    }

    const updated = await this.repository.upsert(platform, updates);
    return { accessToken: tokenResponse.access_token, account: updated };
  }

  private async handleLinkedInCallback(
    code: string,
    redirectUri: string,
    userId: string,
  ): Promise<SocialAccountDocument> {
    const { clientId, clientSecret } = this.getCredentials('linkedin');
    const tokenResponse = await axios.post<TokenResponse>(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = tokenResponse.data.access_token;
    const userInfo = await axios.get<{ sub: string; name?: string; email?: string }>(
      'https://api.linkedin.com/v2/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const accountId = `urn:li:person:${userInfo.data.sub}`;
    return this.repository.upsert('linkedin', {
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: tokenResponse.data.refresh_token
        ? this.crypto.encrypt(tokenResponse.data.refresh_token)
        : undefined,
      tokenExpiry: tokenResponse.data.expires_in
        ? new Date(Date.now() + tokenResponse.data.expires_in * 1000)
        : undefined,
      accountId,
      accountName: userInfo.data.name,
      accountHandle: userInfo.data.email,
      metadata: { email: userInfo.data.email, sub: userInfo.data.sub },
      connectedBy: userId,
    });
  }

  /**
   * Threads issues a short-lived token first, which has to be exchanged for a
   * long-lived one before it is worth storing — the short one expires in about
   * an hour and would leave the connection broken by the next publish.
   */
  private async handleThreadsCallback(
    code: string,
    redirectUri: string,
    userId: string,
  ): Promise<SocialAccountDocument> {
    const { clientId, clientSecret } = this.getCredentials('threads');

    const shortLived = await axios.post<{ access_token: string; user_id: string }>(
      'https://graph.threads.net/oauth/access_token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const longLived = await axios.get<{ access_token: string; expires_in?: number }>(
      'https://graph.threads.net/access_token',
      {
        params: {
          grant_type: 'th_exchange_token',
          client_secret: clientSecret,
          access_token: shortLived.data.access_token,
        },
      },
    );

    const accessToken = longLived.data.access_token;
    const profile = await axios.get<{ id: string; username?: string }>(
      'https://graph.threads.net/v1.0/me',
      { params: { fields: 'id,username', access_token: accessToken } },
    );

    return this.repository.upsert('threads', {
      accessToken: this.crypto.encrypt(accessToken),
      tokenExpiry: longLived.data.expires_in
        ? new Date(Date.now() + longLived.data.expires_in * 1000)
        : undefined,
      accountId: profile.data.id,
      accountName: profile.data.username,
      accountHandle: profile.data.username,
      scopes: ['threads_basic', 'threads_content_publish'],
      status: 'active',
      connectedBy: userId,
    });
  }

  private async handleMetaCallback(
    code: string,
    redirectUri: string,
    userId: string,
  ): Promise<SocialAccountDocument> {
    const { clientId, clientSecret } = this.getCredentials('meta');

    const shortLived = await axios.get<TokenResponse>(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        params: {
          client_id: clientId,
          redirect_uri: redirectUri,
          client_secret: clientSecret,
          code,
        },
      },
    );

    const longLived = await axios.get<TokenResponse>(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: shortLived.data.access_token,
        },
      },
    );

    const userToken = longLived.data.access_token;
    const pages = await axios.get<{ data: Array<{ id: string; name: string; access_token: string }> }>(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`,
      { params: { access_token: userToken } },
    );

    const page = pages.data.data[0];
    if (!page) {
      throw new ValidationError('No Facebook pages found for the connected account');
    }

    let instagramBusinessAccountId: string | undefined;
    try {
      const ig = await axios.get<{ instagram_business_account?: { id: string } }>(
        `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}`,
        { params: { fields: 'instagram_business_account', access_token: page.access_token } },
      );
      instagramBusinessAccountId = ig.data.instagram_business_account?.id;
    } catch (err) {
      this.logger.warn({ err, pageId: page.id }, 'Could not fetch Instagram business account');
    }

    return this.repository.upsert('meta', {
      accessToken: this.crypto.encrypt(page.access_token),
      refreshToken: this.crypto.encrypt(userToken),
      tokenExpiry: longLived.data.expires_in
        ? new Date(Date.now() + longLived.data.expires_in * 1000)
        : undefined,
      accountId: page.id,
      accountName: page.name,
      metadata: { instagramBusinessAccountId },
      connectedBy: userId,
    });
  }

  private async handleXCallback(
    code: string,
    redirectUri: string,
    verifier: string,
    userId: string,
  ): Promise<SocialAccountDocument> {
    const { clientId, clientSecret } = this.getCredentials('x');
    const tokenResponse = await axios.post<TokenResponse>(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      },
    );

    const accessToken = tokenResponse.data.access_token;
    const me = await axios.get<{ data: { id: string; name: string; username: string } }>(
      'https://api.twitter.com/2/users/me',
      {
        params: { 'user.fields': 'id,name,username' },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    return this.repository.upsert('x', {
      accessToken: this.crypto.encrypt(accessToken),
      refreshToken: tokenResponse.data.refresh_token
        ? this.crypto.encrypt(tokenResponse.data.refresh_token)
        : undefined,
      tokenExpiry: tokenResponse.data.expires_in
        ? new Date(Date.now() + tokenResponse.data.expires_in * 1000)
        : undefined,
      accountId: me.data.data.id,
      accountName: me.data.data.name,
      accountHandle: me.data.data.username,
      connectedBy: userId,
    });
  }
}
