import React from 'react';
import { Render } from '@measured/puck';
import type { Data } from '@measured/puck';
import config from './puckConfig';

export type PuckRendererProps = {
  data: Data;
};

export default function PuckRenderer({ data }: PuckRendererProps) {
  return <Render config={config} data={data} />;
}
