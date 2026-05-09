"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

const VerificationFile = () => {
  const { filename } = useParams();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFile = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', `file_${filename}`)
        .single();
      
      if (data) {
        setContent(data.value);
      }
      setLoading(false);
    };
    fetchFile();
  }, [filename]);

  if (loading) return null;
  if (!content) return <div>404 - File Not Found</div>;

  // عرض المحتوى كـ HTML خام
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

export default VerificationFile;