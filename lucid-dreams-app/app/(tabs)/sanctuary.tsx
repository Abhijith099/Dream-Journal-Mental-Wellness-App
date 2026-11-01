import React from 'react';
import SanctuaryArrivalScreen from '../memory-support/index';
import { SanctuaryProvider } from '../../context/SanctuaryContext';
import { SundownProvider } from '../../context/SundownContext';
import { MemorySupportProvider } from '../../context/MemorySupportContext';

export default function SanctuaryTabRoute() {
  return <SanctuaryArrivalScreen />;
}
