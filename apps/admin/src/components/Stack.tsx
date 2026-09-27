import { Stack as MuiStack } from '@mui/material';
import type { StackProps as MuiStackProps } from '@mui/material';
import type { ResponsiveStyleValue } from '@mui/system';
import { forwardRef, type CSSProperties } from 'react';

export interface StackProps extends MuiStackProps {
  alignItems?: ResponsiveStyleValue<CSSProperties['alignItems']>;
  justifyContent?: ResponsiveStyleValue<CSSProperties['justifyContent']>;
  flexWrap?: ResponsiveStyleValue<CSSProperties['flexWrap']>;
  gap?: ResponsiveStyleValue<number | string>;
  noValidate?: boolean;
}

/**
 * MUI's Stack with its layout props (`alignItems`, `justifyContent`,
 * `flexWrap`, `gap`) passed through `sx`.
 *
 * The caller's `sx` goes last in an array rather than being spread into an
 * object: spreading a function (`sx={(theme) => …}`) or an array yields
 * nothing, so every style it held was silently dropped. MUI applies the
 * array in order, so the caller's styles still win.
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { alignItems, justifyContent, flexWrap, gap, sx, ...rest },
  ref,
) {
  return (
    <MuiStack
      ref={ref}
      sx={[
        {
          ...(alignItems !== undefined && { alignItems }),
          ...(justifyContent !== undefined && { justifyContent }),
          ...(flexWrap !== undefined && { flexWrap }),
          ...(gap !== undefined && { gap }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    />
  );
});

export default Stack;
