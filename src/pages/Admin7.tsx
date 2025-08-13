'use client';

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CheckCircle, XCircle } from 'lucide-react'; // Removed unnecessary icons as they are now handled by AdminHeader/AdminLockout
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Import the new components for authentication and header
import AdminLockout from '@/components/admin/AdminLockout';
import AdminHeader from '@/components/admin/AdminHeader';

const Admin7 = () => {
  const { user } = useAuth(); // Get authenticated user details to pass to AdminHeader

  // Fetch teaching ambassador applications
  const { data: applications, isLoading: isApplicationsLoading, isError: isApplicationsError, error: applicationsError } = useQuery({
    queryKey: ['teachingAmbassadorApplications'],
    queryFn: async () => {
      // AdminLockout ensures the user is an admin before this component renders.
      // So, we can directly fetch without explicit isAdmin check here.
      const { data, error } = await supabase
        .from('teaching_ambassador_applications') // Correct table name for teaching ambassadors
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teaching ambassador applications:', error);
        throw new Error('Failed to fetch applications: ' + error.message);
      }
      return data;
    },
    // The query is enabled by default as AdminLockout has already handled initial access control.
    enabled: true,
    retry: false, // Do not retry on failures that might indicate permission issues
  });

  const renderApplicationCard = (app: any) => ( // Use 'any' for now, or define a proper interface
      <Card key={app.id} className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Application from {app.name}</CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                  ID: {app.id.substring(0, 8)}...
              </Badge>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p><strong>Email:</strong> {app.email}</p>
              <p><strong>Contact:</strong> {app.contact_number}</p>
              <p><strong>Gender:</strong> {app.gender}</p>
              <p><strong>Teaching Exp.:</strong> {app.teaching_experience}</p>
              <p><strong>Why Join:</strong> {app.why_join_medistics}</p>
              <p><strong>Subjects:</strong> {app.subjects?.join(', ') || 'N/A'}</p>
              {app.user_id && <p><strong>Supabase User ID:</strong> {app.user_id}</p>}
              <p><strong>Submitted On:</strong> {new Date(app.created_at).toLocaleString()}</p>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 space-y-2">
                  <p className="font-medium text-gray-800 dark:text-gray-200">Uploaded Documents:</p>
                  <ul className="space-y-1">
                      <li>
                          <a href={app.profile_picture_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                              Profile Picture <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                      </li>
                      <li>
                          <a href={app.cnic_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center">
                              CNIC Upload <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                      </li>
                  </ul>
              </div>
          </CardContent>
      </Card>
  );

  return (
    <AdminLockout>
      <div className="min-h-screen w-full bg-white dark:bg-gray-900">
        {/* Use the shared AdminHeader component for consistency */}
        <AdminHeader userEmail={user?.email} />

        <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              🧑‍🏫 Teaching Ambassador Applications
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Review and manage applications from aspiring teaching ambassadors.
            </p>
          </div>

          {isApplicationsLoading ? (
            <div className="flex justify-center items-center h-48">
              <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3 text-lg text-gray-600 dark:text-gray-300">Loading applications...</p>
            </div>
          ) : isApplicationsError ? (
            <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-2xl mx-auto">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Applications</h2>
              <p className="text-red-600 dark:text-red-300">{applicationsError.message}</p>
            </div>
          ) : applications?.length === 0 ? (
            <div className="text-center p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-2xl mx-auto">
              <CheckCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-2">No Applications Found</h2>
              <p className="text-blue-600 dark:text-blue-300">There are currently no teaching ambassador applications to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map(renderApplicationCard)}
            </div>
          )}
        </div>
      </div>
    </AdminLockout>
  );
};

export default Admin7;
