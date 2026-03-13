import { mergeWith, isArray } from 'lodash-es';

/**
 * Deep merge for F1 delta payloads.
 * Arrays are replaced by default (live timing); set isHistoricalArray for append (race control).
 */
export function mergeDeltaUpdate<T>(
  existingState: T,
  deltaData: Partial<T>,
  isHistoricalArray = false
): T {
  return mergeWith(
    {},
    existingState,
    deltaData,
    (objValue: unknown, srcValue: unknown) => {
      if (isArray(objValue) && isArray(srcValue)) {
        if (isHistoricalArray) {
          return [...objValue, ...srcValue];
        }
        return srcValue;
      }
      return undefined;
    }
  );
}
