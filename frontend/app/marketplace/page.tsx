'use client';

import React from 'react';
import { MarketplaceProvider, useMarketplace } from '@/src/context/MarketplaceContext';
import { MarketplaceLayout } from '@/src/components/marketplace/MarketplaceLayout';
import { HomeView } from '@/src/components/marketplace/HomeView';
import { BooksView, VideosView, CoursesView, ResourcesView, BundlesView, SearchView } from '@/src/components/marketplace/ListView';
import { BookDetail, VideoDetail, CourseDetail, ResourceDetail, BundleDetail } from '@/src/components/marketplace/DetailViews';
import { CheckoutView, PurchaseSuccessView } from '@/src/components/marketplace/CheckoutView';
import { LibraryView, WishlistView, PurchasesView } from '@/src/components/marketplace/LibraryViews';

function MarketplaceRouter() {
  const { state } = useMarketplace();
  const { view, selectedId } = state;

  const renderView = () => {
    switch (view) {
      case 'home':            return <HomeView />;
      case 'books':           return selectedId ? <BookDetail id={selectedId} /> : <BooksView />;
      case 'videos':          return selectedId ? <VideoDetail id={selectedId} /> : <VideosView />;
      case 'courses':         return selectedId ? <CourseDetail id={selectedId} /> : <CoursesView />;
      case 'resources':       return selectedId ? <ResourceDetail id={selectedId} /> : <ResourcesView />;
      case 'bundles':         return selectedId ? <BundleDetail id={selectedId} /> : <BundlesView />;
      case 'wishlist':        return <WishlistView />;
      case 'library':         return <LibraryView />;
      case 'purchases':       return <PurchasesView />;
      case 'checkout':        return <CheckoutView />;
      case 'purchase-success': return <PurchaseSuccessView />;
      case 'search':          return <SearchView query={state.searchQuery} />;
      default:                return <HomeView />;
    }
  };

  return (
    <MarketplaceLayout>
      {renderView()}
    </MarketplaceLayout>
  );
}

export default function MarketplacePage() {
  return (
    <MarketplaceProvider>
      <MarketplaceRouter />
    </MarketplaceProvider>
  );
}
