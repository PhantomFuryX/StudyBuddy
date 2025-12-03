import React from 'react';
import { router } from 'expo-router';
import ProfileScreen from '../../screens/ProfileScreen';

export default function ProfileRouteWrapper() {
  const navigation = {
    navigate: (name, params) => {
      if (name === 'Exams') return router.push('/exams');
      if (name === 'Home') return router.push('/');
      return router.push('/');
    },
    replace: (name, params) => {
      if (name === 'Onboarding') return router.replace('/onboarding');
      return router.replace('/');
    },
    reset: ({ routes }) => {
      const target = routes?.[0]?.name || 'onboarding';
      if (target === 'Onboarding' || target === 'onboarding') return router.replace('/onboarding');
      return router.replace('/');
    },
  };
  return <ProfileScreen navigation={navigation} />;
}
