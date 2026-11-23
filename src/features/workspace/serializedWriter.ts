export function createSerializedWriter<T>(
  write: (value: T) => Promise<void>
): (value: T) => Promise<void> {
  let previous = Promise.resolve();
  return value => {
    const current = previous.then(() => write(value));
    previous = current.then(
      () => undefined,
      () => undefined
    );
    return current;
  };
}
