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

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  { alignItems, justifyContent, flexWrap, gap, sx, ...rest },
  ref,
) {
  return (
    <MuiStack
      ref={ref}
      sx={{
        ...(alignItems !== undefined && { alignItems }),
        ...(justifyContent !== undefined && { justifyContent }),
        ...(flexWrap !== undefined && { flexWrap }),
        ...(gap !== undefined && { gap }),
        ...sx,
      }}
      {...rest}
    />
  );
});

export default Stack;
