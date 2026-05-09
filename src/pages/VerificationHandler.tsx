"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

const VerificationHandler = () => {
  const { filename } = useParams();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFile = async () => {
      if (!filename) return;
      
      const { data, error } = await supabase
        .from('verification_files')
        .select('content')
        .eq('path', filename)
        .single();

      if (!error && data) {
        setContent(data.content);
      }
      setLoading(false);
    };

    fetchFile();
  }, [filename]);

  if (loading) return null;

  if (content !== null) {
    // إذا كان الملف HTML، نقوم بعرضه كصفحة كاملة
    if (filename?.endsWith('.html')) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }
    // للملفات النصية مثل ads.txt
    return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', padding: '20px' }}>{content}</pre>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600">File Not Found</p>
      </div>
    </div>
  );
};

export default VerificationHandler;