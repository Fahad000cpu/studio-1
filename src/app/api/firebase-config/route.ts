
import { NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';

export async function GET() {
  const config = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
    measurementId: firebaseConfig.measurementId,
  };
  return NextResponse.json(config);
}
