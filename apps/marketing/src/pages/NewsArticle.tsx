import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { PageHero } from '../components/PageHero';
import { Seo } from '../components/Seo';
import { useArticle } from '../lib/content-hooks';

const NewsArticle = (): JSX.Element => {
  const { slug = '' } = useParams();
  const { data: article, isLoading, isError } = useArticle(slug);

  if (isLoading) {
    return (
      <Container sx={{ py: 8 }}>
        <Skeleton width="60%" height={56} />
        <Skeleton width="30%" />
        <Skeleton variant="rectangular" height={280} sx={{ my: 3, borderRadius: 2 }} />
        <Skeleton /> <Skeleton /> <Skeleton width="80%" />
      </Container>
    );
  }

  if (isError || !article) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Article not found
        </Typography>
        <Button component={RouterLink} to="/news" startIcon={<ArrowBackIcon />}>
          Back to News
        </Button>
      </Container>
    );
  }

  return (
    <>
      <Seo title={article.title} description={article.excerpt} />
      <PageHero title={article.title} subtitle={article.excerpt} />
      <Container sx={{ py: { xs: 5, md: 8 }, maxWidth: 'md' }}>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {article.tags.map((tag) => (
            <Chip key={tag} size="small" label={tag} />
          ))}
        </Stack>
        {article.coverImage && (
          <Box
            component="img"
            src={article.coverImage.url}
            alt={article.coverImage.alt ?? article.title}
            sx={{ width: '100%', borderRadius: 2, mb: 4 }}
          />
        )}
        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{article.body}</Typography>
        <Button component={RouterLink} to="/news" startIcon={<ArrowBackIcon />} sx={{ mt: 4 }}>
          Back to News
        </Button>
      </Container>
    </>
  );
};

export default NewsArticle;
