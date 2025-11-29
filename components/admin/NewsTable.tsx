

import React, { useState, useEffect, useCallback } from 'react';
import { getNewsWithAuthors, updateNewsStatus } from '../../services/adminService';
import { NewsArticle, NewsStatus } from '../../types';
import { Pagination } from './Pagination';
import { NewsViewModal } from './NewsViewModal';
import { useUser } from '../../contexts/UserContext';

const NEWS_PER_PAGE = 10;

interface NewsTableProps {
    onEdit: (article: NewsArticle) => void;
    dataVersion: number;
    statusFilter?: NewsStatus | 'all'; // Now optional and can be passed
}

export function NewsTable({ onEdit, dataVersion, statusFilter: initialStatusFilter = 'all' }: NewsTableProps) {
  const { user: adminUser } = useUser();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [totalNews, setTotalNews] = useState(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [viewingArticle, setViewingArticle] = useState<NewsArticle | null>(null);

  // Filtering and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [currentStatusFilter, setCurrentStatusFilter] = useState<NewsStatus | 'all'>(initialStatusFilter);

  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { news: newsList, count } = await getNewsWithAuthors({ 
          page: currentPage, 
          limit: NEWS_PER_PAGE,
          status: currentStatusFilter,
      });
      setNews(newsList);
      setTotalNews(count);
    } catch