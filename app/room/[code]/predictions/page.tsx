'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PredictionsRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/room/${params.code}`);
  }, [params.code, router]);
  return null;
}
