
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  type?: 'article' | 'website';
  publishedTime?: string;
  author?: string;
}

export function SeoHead({ 
  title, 
  description, 
  canonicalUrl, 
  ogImage = 'https://gdn.ia/default-og.jpg', 
  type = 'article',
  publishedTime,
  author
}: SeoHeadProps) {
  const siteName = 'GDN_IA - Gerador de Notícias';
  const currentUrl = window.location.href;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title} | {siteName}</title>
      <meta name="description" content={description.substring(0, 160)} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta name="robots" content="index, follow" />

      {/* Open Graph (Facebook/LinkedIn) */}
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description.substring(0, 200)} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {author && <meta property="article:author" content={author} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description.substring(0, 200)} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
