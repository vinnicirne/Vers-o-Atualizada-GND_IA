

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex justify-between items-center mt-4 px-2">
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 border border-gray-700"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-500">
        Página {currentPage} de {totalPages}
      </span>
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 border border-gray-700"
      >
        Próximo
      </button>
    </div>
  );
};