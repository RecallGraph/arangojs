/**
 * ```ts
 * import type {
 *   FulltextIndex,
 *   GeoIndex,
 *   HashIndex,
 *   PersistentIndex,
 *   PrimaryIndex,
 *   SkiplistIndex,
 *   TtlIndex,
 * } from "arangojs/indexes";
 * ```
 *
 * The "indexes" module provides index-related types for TypeScript.
 *
 * @packageDocumentation
 */
/**
 * (MMFiles only.) Options for creating a hash index.
 *
 * When using the RocksDB storage engine, this index type behaves identically
 * to {@link EnsurePersistentIndexOptions}.
 */
export declare type EnsureHashIndexOptions = {
    /**
     * Type of this index.
     */
    type: "hash";
    /**
     * An array of attribute paths.
     */
    fields: string[];
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
    /**
     * If set to `false`, array values will not be deduplicated.
     *
     * Default: `true`
     */
    deduplicate?: boolean;
};
/**
 * (MMFiles only.) Options for creating a skiplist index.
 *
 * When using the RocksDB storage engine, this index type behaves identically
 * to {@link EnsurePersistentIndexOptions}.
 */
export declare type EnsureSkiplistIndexOptions = {
    /**
     * Type of this index.
     */
    type: "skiplist";
    /**
     * An array of attribute paths.
     */
    fields: string[];
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
    /**
     * If set to `false`, array values will not be deduplicated.
     *
     * Default: `true`
     */
    deduplicate?: boolean;
};
/**
 * Options for creating a persistent index.
 */
export declare type EnsurePersistentIndexOptions = {
    /**
     * Type of this index.
     */
    type: "persistent";
    /**
     * An array of attribute paths.
     */
    fields: string[];
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * If set to `true`, a unique index will be created.
     *
     * Default: `false`
     */
    unique?: boolean;
    /**
     * If set to `true`, the index will omit documents that do not contain at
     * least one of the attribute paths in `fields` and these documents will be
     * ignored for uniqueness checks.
     *
     * Default: `false`
     */
    sparse?: boolean;
};
/**
 * Options for creating a geo index.
 */
export declare type EnsureGeoIndexOptions = {
    type: "geo";
    /**
     * If set to `true`, `fields` must be an array containing a single attribute
     * path and the attribute value must be an array with two values, the first
     * of which will be interpreted as the longitude and the second of which will
     * be interpreted as the latitude of the document.
     *
     * Default: `false`
     */
    geoJson?: false;
    /**
     * Attribute paths for the document's latitude and longitude values.
     */
    fields: [string, string];
    /**
     * A unique name for this index.
     */
    name?: string;
} | {
    type: "geo";
    /**
     * If set to `true`, `fields` must be an array containing a single attribute
     * path and the attribute value must be an array with two values, the first
     * of which will be interpreted as the longitude and the second of which will
     * be interpreted as the latitude of the document.
     *
     * Default: `false`
     */
    geoJson?: boolean;
    /**
     * An array containing the attribute path for an array containing two values,
     * the first of which will be interpreted as the latitude, the second as the
     * longitude. If `geoJson` is set to `true`, the order is reversed to match
     * the GeoJSON format.
     */
    fields: [string];
    /**
     * A unique name for this index.
     */
    name?: string;
};
/**
 * Options for creating a fulltext index.
 */
export declare type EnsureFulltextIndexOptions = {
    /**
     * Type of this index.
     */
    type: "fulltext";
    /**
     * An array containing exactly one attribute path.
     */
    fields: [string];
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * Minimum character length of words to index.
     */
    minLength?: number;
};
/**
 * Options for creating a TTL index.
 */
export declare type EnsureTtlIndexOptions = {
    /**
     * Type of this index.
     */
    type: "ttl";
    /**
     * An array containing exactly one attribute path.
     */
    fields: [string];
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * Duration in seconds after the attribute value at which the document will
     * be considered as expired.
     */
    expireAfter: number;
};
/**
 * Shared attributes of all index types.
 */
export declare type GenericIndex = {
    /**
     * A unique name for this index.
     */
    name?: string;
    /**
     * A unique identifier for this index.
     */
    id: string;
    /**
     * Whether documents not containing at least one of the attribute paths
     * are omitted by this index.
     */
    sparse: boolean;
    /**
     * Whether this index enforces uniqueness for values of its attribute paths.
     */
    unique: boolean;
};
/**
 * An object representing a persistent index.
 */
export declare type PersistentIndex = GenericIndex & {
    type: "persistent";
    fields: string[];
};
/**
 * An object representing a skiplist index.
 */
export declare type SkiplistIndex = GenericIndex & {
    type: "skiplist";
    fields: string[];
};
/**
 * An object representing a hash index.
 */
export declare type HashIndex = GenericIndex & {
    type: "hash";
    fields: string[];
    selectivityEstimate: number;
};
/**
 * An object representing a primary index.
 */
export declare type PrimaryIndex = GenericIndex & {
    type: "primary";
    fields: string[];
    selectivityEstimate: number;
};
/**
 * An object representing a fulltext index.
 */
export declare type FulltextIndex = GenericIndex & {
    type: "fulltext";
    fields: [string];
    minLength: number;
};
/**
 * An object representing a geo index.
 */
export declare type GeoIndex = GenericIndex & {
    type: "geo";
    fields: [string] | [string, string];
    geoJson: boolean;
    bestIndexedLevel: number;
    worstIndexedLevel: number;
    maxNumCoverCells: number;
};
/**
 * An object representing a TTL index.
 */
export declare type TtlIndex = GenericIndex & {
    type: "ttl";
    fields: [string];
    expireAfter: number;
    selectivityEstimate: number;
};
/**
 * An object representing an index.
 */
export declare type Index = GeoIndex | FulltextIndex | PersistentIndex | PrimaryIndex | HashIndex | SkiplistIndex | TtlIndex;
export declare type ObjectWithId = {
    [key: string]: any;
    id: string;
};
export declare type ObjectWithName = {
    [key: string]: any;
    name: string;
};
/**
 * Index name, id or object with a `name` or `id` property.
 */
export declare type IndexSelector = ObjectWithId | ObjectWithName | string;
/**
 * @internal
 * @hidden
 */
export declare function _indexHandle(selector: IndexSelector, collectionName: string): string;
//# sourceMappingURL=indexes.d.ts.map