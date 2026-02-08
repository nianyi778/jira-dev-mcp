/**
 * Mock KVNamespace implementation for testing
 */

export interface MockKVOptions {
  /** Initial data to populate the KV store */
  initialData?: Record<string, string>;
}

interface KVListKey {
  name: string;
  expiration?: number;
  metadata?: unknown;
}

interface KVListResult {
  keys: KVListKey[];
  list_complete: boolean;
  cursor?: string;
}

/**
 * Creates a mock KVNamespace that stores data in memory
 */
export function createMockKV(options: MockKVOptions = {}): KVNamespace {
  const store = new Map<string, { value: string; expiration?: number }>();
  
  // Initialize with provided data
  if (options.initialData) {
    for (const [key, value] of Object.entries(options.initialData)) {
      store.set(key, { value });
    }
  }

  const mockKV: KVNamespace = {
    get: async (key: string, options?: KVNamespaceGetOptions<'text'> | 'text' | 'json' | 'arrayBuffer' | 'stream') => {
      const entry = store.get(key);
      if (!entry) return null;
      
      // Check expiration
      if (entry.expiration && Date.now() / 1000 > entry.expiration) {
        store.delete(key);
        return null;
      }
      
      const type = typeof options === 'string' ? options : options?.type ?? 'text';
      
      if (type === 'json') {
        try {
          return JSON.parse(entry.value);
        } catch {
          return null;
        }
      }
      
      if (type === 'arrayBuffer') {
        return new TextEncoder().encode(entry.value).buffer;
      }
      
      if (type === 'stream') {
        return new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(entry.value));
            controller.close();
          },
        });
      }
      
      return entry.value;
    },

    put: async (
      key: string,
      value: string | ArrayBuffer | ReadableStream,
      options?: KVNamespacePutOptions
    ) => {
      let stringValue: string;
      
      if (typeof value === 'string') {
        stringValue = value;
      } else if (value instanceof ArrayBuffer) {
        stringValue = new TextDecoder().decode(value);
      } else {
        // ReadableStream - read all chunks
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
        }
        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
        stringValue = new TextDecoder().decode(combined);
      }

      let expiration: number | undefined;
      if (options?.expirationTtl) {
        expiration = Math.floor(Date.now() / 1000) + options.expirationTtl;
      } else if (options?.expiration) {
        expiration = options.expiration;
      }

      store.set(key, { value: stringValue, expiration });
    },

    delete: async (key: string) => {
      store.delete(key);
    },

    list: async (options?: KVNamespaceListOptions): Promise<KVListResult> => {
      const prefix = options?.prefix ?? '';
      const limit = options?.limit ?? 1000;
      
      const keys: KVListKey[] = [];
      
      for (const [key, entry] of store.entries()) {
        if (key.startsWith(prefix)) {
          // Check expiration
          if (entry.expiration && Date.now() / 1000 > entry.expiration) {
            store.delete(key);
            continue;
          }
          keys.push({
            name: key,
            expiration: entry.expiration,
          });
        }
      }
      
      // Sort by key name for consistent ordering
      keys.sort((a, b) => a.name.localeCompare(b.name));
      
      const limitedKeys = keys.slice(0, limit);
      
      return {
        keys: limitedKeys,
        list_complete: limitedKeys.length === keys.length,
        cursor: limitedKeys.length < keys.length ? 'cursor' : undefined,
      };
    },

    // Methods that are less commonly used - provide minimal implementations
    getWithMetadata: async (key: string, options?: unknown) => {
      const value = await mockKV.get(key, options as KVNamespaceGetOptions<'text'>);
      return { value, metadata: null, cacheStatus: null };
    },
  } as KVNamespace;

  // Add helper methods for testing
  (mockKV as MockKVNamespace)._store = store;
  (mockKV as MockKVNamespace)._clear = () => store.clear();
  (mockKV as MockKVNamespace)._size = () => store.size;
  (mockKV as MockKVNamespace)._dump = () => {
    const result: Record<string, string> = {};
    for (const [key, entry] of store.entries()) {
      result[key] = entry.value;
    }
    return result;
  };

  return mockKV;
}

/**
 * Extended mock KV interface with testing helpers
 */
export interface MockKVNamespace extends KVNamespace {
  /** Internal store for inspection */
  _store: Map<string, { value: string; expiration?: number }>;
  /** Clear all data */
  _clear: () => void;
  /** Get number of entries */
  _size: () => number;
  /** Dump all data as plain object */
  _dump: () => Record<string, string>;
}
