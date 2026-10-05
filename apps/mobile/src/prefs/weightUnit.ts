import * as SecureStore from 'expo-secure-store';

export type WeightUnit = 'LB' | 'KG';

const KEY = 'preferred-weight-unit';

// Not a secret, but secure-store is the only key-value store the app already ships with.
export async function readWeightUnit(): Promise<WeightUnit> {
  const stored = await SecureStore.getItemAsync(KEY);
  return stored === 'KG' ? 'KG' : 'LB';
}

export async function writeWeightUnit(unit: WeightUnit): Promise<void> {
  await SecureStore.setItemAsync(KEY, unit);
}
