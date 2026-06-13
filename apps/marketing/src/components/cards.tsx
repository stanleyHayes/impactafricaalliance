import { brandColors, type Article, type PillarDefinition } from '@iaa/shared';
import EastIcon from '@mui/icons-material/East';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

const PILLAR_EMOJI: Record<string, string> = {
  'digital-skills': '💻',
  'stem-learning': '🔬',
  'climate-action': '🌱',
  'women-empowerment': '👩🏾‍💼',
};

export const PillarCard = ({ pillar }: { pillar: PillarDefinition }): JSX.Element => (
  <Card
    sx={{
      height: '100%',
      bgcolor: brandColors.lightGreen,
      borderTop: 4,
      borderColor: 'primary.main',
      transition: 'transform .2s, box-shadow .2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Typography sx={{ fontSize: 40 }} aria-hidden>
        {PILLAR_EMOJI[pillar.key] ?? '⭐'}
      </Typography>
      <Typography variant="h6" sx={{ mt: 1 }}>
        {pillar.title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        {pillar.description}
      </Typography>
      <Button component={RouterLink} to={pillar.path} endIcon={<EastIcon />} sx={{ mt: 1, px: 0 }}>
        Learn More
      </Button>
    </CardContent>
  </Card>
);

interface StoryCardProps {
  name: string;
  country: string;
  program: string;
  quote: string;
  photoUrl?: string;
}

export const StoryCard = ({
  name,
  country,
  program,
  quote,
  photoUrl,
}: StoryCardProps): JSX.Element => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardContent sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={photoUrl} sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
          {name.charAt(0)}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {country} · {program}
          </Typography>
        </Box>
      </Stack>
      <Typography sx={{ mt: 2, fontStyle: 'italic' }}>“{quote}”</Typography>
    </CardContent>
  </Card>
);

export const ArticleCard = ({ article }: { article: Article }): JSX.Element => (
  <Card variant="outlined" sx={{ height: '100%' }}>
    <CardActionArea component={RouterLink} to={`/news/${article.slug}`} sx={{ height: '100%' }}>
      <Box
        sx={{
          height: 180,
          bgcolor: 'primary.dark',
          backgroundImage: article.coverImage ? `url(${article.coverImage.url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          {(article.publishedAt ?? article.createdAt) && (
            <Chip
              size="small"
              label={new Date(article.publishedAt ?? article.createdAt).toLocaleDateString()}
            />
          )}
        </Stack>
        <Typography variant="h6">{article.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {article.excerpt}
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);
