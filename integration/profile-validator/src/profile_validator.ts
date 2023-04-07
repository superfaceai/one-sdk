import { unstable } from 'map-std';
import type { AnyValue } from 'map-std/types/unstable';
import { getFruit } from './index';

const input = unstable.takeInput();
unstable.setOutputSuccess({ fruit: getFruit(input) } as AnyValue);
