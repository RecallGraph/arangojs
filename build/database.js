"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.isArangoDatabase = void 0;
const analyzer_1 = require("./analyzer");
const aql_1 = require("./aql");
const collection_1 = require("./collection");
const connection_1 = require("./connection");
const cursor_1 = require("./cursor");
const error_1 = require("./error");
const graph_1 = require("./graph");
const codes_1 = require("./lib/codes");
const multipart_1 = require("./lib/multipart");
const route_1 = require("./route");
const transaction_1 = require("./transaction");
const view_1 = require("./view");
/**
 * Indicates whether the given value represents a {@link Database}.
 *
 * @param database - A value that might be a database.
 */
function isArangoDatabase(database) {
    return Boolean(database && database.isArangoDatabase);
}
exports.isArangoDatabase = isArangoDatabase;
/**
 * @internal
 * @hidden
 */
function coerceTransactionCollections(collections) {
    if (typeof collections === "string") {
        return { write: [collections] };
    }
    if (Array.isArray(collections)) {
        return { write: collections.map(collection_1.collectionToString) };
    }
    if (collection_1.isArangoCollection(collections)) {
        return { write: collection_1.collectionToString(collections) };
    }
    const cols = {};
    if (collections) {
        if (collections.allowImplicit !== undefined) {
            cols.allowImplicit = collections.allowImplicit;
        }
        if (collections.read) {
            cols.read = Array.isArray(collections.read)
                ? collections.read.map(collection_1.collectionToString)
                : collection_1.collectionToString(collections.read);
        }
        if (collections.write) {
            cols.write = Array.isArray(collections.write)
                ? collections.write.map(collection_1.collectionToString)
                : collection_1.collectionToString(collections.write);
        }
        if (collections.exclusive) {
            cols.exclusive = Array.isArray(collections.exclusive)
                ? collections.exclusive.map(collection_1.collectionToString)
                : collection_1.collectionToString(collections.exclusive);
        }
    }
    return cols;
}
/**
 * An object representing a single ArangoDB database. All arangojs collections,
 * cursors, analyzers and so on are linked to a `Database` object.
 */
class Database {
    // There's currently no way to hide a single overload from typedoc
    // /**
    //  * @internal
    //  * @hidden
    //  */
    // constructor(database: Database, name?: string);
    constructor(configOrDatabase = {}, name) {
        this._analyzers = new Map();
        this._collections = new Map();
        this._graphs = new Map();
        this._views = new Map();
        if (isArangoDatabase(configOrDatabase)) {
            const connection = configOrDatabase._connection;
            const databaseName = name || configOrDatabase.name;
            this._connection = connection;
            this._name = databaseName;
            const database = connection.database(databaseName);
            if (database)
                return database;
        }
        else {
            const config = configOrDatabase;
            const { databaseName, ...options } = typeof config === "string" || Array.isArray(config)
                ? { databaseName: name, url: config }
                : config;
            this._connection = new connection_1.Connection(options);
            this._name = databaseName || "_system";
        }
    }
    //#region misc
    /**
     * @internal
     *
     * Indicates that this object represents an ArangoDB database.
     */
    get isArangoDatabase() {
        return true;
    }
    /**
     * Name of the ArangoDB database this instance represents.
     */
    get name() {
        return this._name;
    }
    /**
     * Fetches version information from the ArangoDB server.
     *
     * @param details - If set to `true`, additional information about the
     * ArangoDB server will be available as the `details` property.
     *
     * @example
     * ```js
     * const db = new Database();
     * const version = await db.version();
     * // the version object contains the ArangoDB version information.
     * // license: "community" or "enterprise"
     * // version: ArangoDB version number
     * // server: description of the server
     * ```
     */
    version(details) {
        return this.request({
            method: "GET",
            path: "/_api/version",
            qs: { details },
        }, (res) => res.body);
    }
    /**
     * Returns a new {@link Route} instance for the given path (relative to the
     * database) that can be used to perform arbitrary HTTP requests.
     *
     * @param path - The database-relative URL of the route. Defaults to the
     * database API root.
     * @param headers - Default headers that should be sent with each request to
     * the route.
     *
     * @example
     * ```js
     * const db = new Database();
     * const myFoxxService = db.route("my-foxx-service");
     * const response = await myFoxxService.post("users", {
     *   username: "admin",
     *   password: "hunter2"
     * });
     * // response.body is the result of
     * // POST /_db/_system/my-foxx-service/users
     * // with JSON request body '{"username": "admin", "password": "hunter2"}'
     * ```
     */
    route(path, headers) {
        return new route_1.Route(this, path, headers);
    }
    request({ absolutePath = false, basePath, ...opts }, transform) {
        if (!absolutePath) {
            basePath = `/_db/${this.name}${basePath || ""}`;
        }
        return this._connection.request({ basePath, ...opts }, transform);
    }
    /**
     * Updates the URL list by requesting a list of all coordinators in the
     * cluster and adding any endpoints not initially specified in the
     * {@link Config}.
     *
     * For long-running processes communicating with an ArangoDB cluster it is
     * recommended to run this method periodically (e.g. once per hour) to make
     * sure new coordinators are picked up correctly and can be used for
     * fail-over or load balancing.
     *
     * @example
     * ```js
     * const db = new Database();
     * const interval = setInterval(
     *   () => db.acquireHostList(),
     *   5 * 60 * 1000 // every 5 minutes
     * );
     *
     * // later
     * clearInterval(interval);
     * db.close();
     * ```
     */
    async acquireHostList() {
        const urls = await this.request({ path: "/_api/cluster/endpoints" }, (res) => res.body.endpoints.map((endpoint) => endpoint.endpoint));
        this._connection.addToHostList(urls);
    }
    /**
     * Closes all active connections of this database instance.
     *
     * Can be used to clean up idling connections during longer periods of
     * inactivity.
     *
     * **Note**: This method currently has no effect in the browser version of
     * arangojs.
     *
     * @example
     * ```js
     * const db = new Database();
     * const sessions = db.collection("sessions");
     * // Clean up expired sessions once per hour
     * setInterval(async () => {
     *   await db.query(aql`
     *     FOR session IN ${sessions}
     *     FILTER session.expires < DATE_NOW()
     *     REMOVE session IN ${sessions}
     *   `);
     *   // Making sure to close the connections because they're no longer used
     *   db.close();
     * }, 1000 * 60 * 60);
     * ```
     */
    close() {
        this._connection.close();
    }
    //#endregion
    //#region auth
    /**
     * Updates the `Database` instance and its connection string to use the given
     * `databaseName`, then returns itself.
     *
     * **Note**: This also affects all collections, cursors and other arangojs
     * objects originating from this database object, which may cause unexpected
     * results.
     *
     * @param databaseName - Name of the database to use.
     *
     * @deprecated Use {@link Database.database} instead.
     *
     * @example
     * ```js
     * const systemDb = new Database();
     * // systemDb.useDatabase("my_database"); // deprecated
     * const myDb = systemDb.database("my_database");
     * ```
     */
    useDatabase(databaseName) {
        this._connection.database(this._name, null);
        this._name = databaseName;
        return this;
    }
    /**
     * Updates the `Database` instance's `authorization` header to use Basic
     * authentication with the given `username` and `password`, then returns
     * itself.
     *
     * @param username - The username to authenticate with.
     * @param password - The password to authenticate with.
     *
     * @example
     * ```js
     * const db = new Database();
     * db.useDatabase("test");
     * db.useBasicAuth("admin", "hunter2");
     * // The database instance now uses the database "test"
     * // with the username "admin" and password "hunter2".
     * ```
     */
    useBasicAuth(username = "root", password = "") {
        this._connection.setBasicAuth({ username, password });
        return this;
    }
    /**
     * Updates the `Database` instance's `authorization` header to use Bearer
     * authentication with the given authentication `token`, then returns itself.
     *
     * @param token - The token to authenticate with.
     *
     * @example
     * ```js
     * const db = new Database();
     * db.useBearerAuth("keyboardcat");
     * // The database instance now uses Bearer authentication.
     * ```
     */
    useBearerAuth(token) {
        this._connection.setBearerAuth({ token });
        return this;
    }
    /**
     * Validates the given database credentials and exchanges them for an
     * authentication token, then uses the authentication token for future
     * requests and returns it.
     *
     * @param username - The username to authenticate with.
     * @param password - The password to authenticate with.
     *
     * @example
     * ```js
     * const db = new Database();
     * db.useDatabase("test");
     * await db.login("admin", "hunter2");
     * // The database instance now uses the database "test"
     * // with an authentication token for the "admin" user.
     * ```
     */
    login(username = "root", password = "") {
        return this.request({
            method: "POST",
            path: "/_open/auth",
            body: { username, password },
        }, (res) => {
            this.useBearerAuth(res.body.jwt);
            return res.body.jwt;
        });
    }
    //#endregion
    //#region databases
    /**
     * Creates a new `Database` instance for the given `databaseName` that
     * shares this database's connection pool.
     *
     * See also {@link Database.constructor}.
     *
     * @param databaseName - Name of the database.
     *
     * @example
     * ```js
     * const systemDb = new Database();
     * const myDb = system.database("my_database");
     * ```
     */
    database(databaseName) {
        const db = new Database(this, databaseName);
        return db;
    }
    /**
     * Fetches the database description for the active database from the server.
     *
     * @example
     * ```js
     * const db = new Database();
     * const info = await db.get();
     * // the database exists
     * ```
     */
    get() {
        return this.request({ path: "/_api/database/current" }, (res) => res.body.result);
    }
    /**
     * Checks whether the database exists.
     *
     * @example
     * ```js
     * const db = new Database();
     * const result = await db.exists();
     * // result indicates whether the database exists
     * ```
     */
    async exists() {
        try {
            await this.get();
            return true;
        }
        catch (err) {
            if (error_1.isArangoError(err) && err.errorNum === codes_1.DATABASE_NOT_FOUND) {
                return false;
            }
            throw err;
        }
    }
    createDatabase(databaseName, usersOrOptions) {
        const { users, ...options } = Array.isArray(usersOrOptions)
            ? { users: usersOrOptions }
            : usersOrOptions || {};
        return this.request({
            method: "POST",
            path: "/_api/database",
            body: { name: databaseName, users, options },
        }, () => this.database(databaseName));
    }
    /**
     * Fetches all databases from the server and returns an array of their names.
     *
     * See also {@link Database.databases} and
     * {@link Database.listUserDatabases}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const names = await db.listDatabases();
     * // databases is an array of database names
     * ```
     */
    listDatabases() {
        return this.request({ path: "/_api/database" }, (res) => res.body.result);
    }
    /**
     * Fetches all databases accessible to the active user from the server and
     * returns an array of their names.
     *
     * See also {@link Database.userDatabases} and
     * {@link Database.listDatabases}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const names = await db.listUserDatabases();
     * // databases is an array of database names
     * ```
     */
    listUserDatabases() {
        return this.request({ path: "/_api/database/user" }, (res) => res.body.result);
    }
    /**
     * Fetches all databases from the server and returns an array of `Database`
     * instances for those databases.
     *
     * See also {@link Database.listDatabases} and
     * {@link Database.userDatabases}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const names = await db.databases();
     * // databases is an array of databases
     * ```
     */
    databases() {
        return this.request({ path: "/_api/database" }, (res) => res.body.result.map((databaseName) => this.database(databaseName)));
    }
    /**
     * Fetches all databases accessible to the active user from the server and
     * returns an array of `Database` instances for those databases.
     *
     * See also {@link Database.listUserDatabases} and
     * {@link Database.databases}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const names = await db.userDatabases();
     * // databases is an array of databases
     * ```
     */
    userDatabases() {
        return this.request({ path: "/_api/database/user" }, (res) => res.body.result.map((databaseName) => this.database(databaseName)));
    }
    /**
     * Deletes the database with the given `databaseName` from the server.
     *
     * @param databaseName - Name of the database to delete.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.dropDatabase("mydb");
     * // database "mydb" no longer exists
     * ```
     */
    dropDatabase(databaseName) {
        return this.request({
            method: "DELETE",
            path: `/_api/database/${databaseName}`,
        }, (res) => res.body.result);
    }
    //#endregion
    //#region collections
    /**
     * Returns a `Collection` instance for the given collection name.
     *
     * In TypeScript the collection implements both the
     * {@link DocumentCollection} and {@link EdgeCollection} interfaces and can
     * be cast to either type to enforce a stricter API.
     *
     * @param T - Type to use for document data. Defaults to `any`.
     * @param collectionName - Name of the edge collection.
     *
     * @example
     * ```js
     * const db = new Database();
     * const collection = db.collection("potatoes");
     * ```
     *
     * @example
     * ```ts
     * interface Person {
     *   name: string;
     * }
     * const db = new Database();
     * const persons = db.collection<Person>("persons");
     * ```
     *
     * @example
     * ```ts
     * interface Person {
     *   name: string;
     * }
     * interface Friend {
     *   startDate: number;
     *   endDate?: number;
     * }
     * const db = new Database();
     * const documents = db.collection("persons") as DocumentCollection<Person>;
     * const edges = db.collection("friends") as EdgeCollection<Friend>;
     * ```
     */
    collection(collectionName) {
        if (!this._collections.has(collectionName)) {
            this._collections.set(collectionName, new collection_1.Collection(this, collectionName));
        }
        return this._collections.get(collectionName);
    }
    async createCollection(collectionName, options) {
        const collection = this.collection(collectionName);
        await collection.create(options);
        return collection;
    }
    /**
     * Creates a new edge collection with the given `collectionName` and
     * `options`, then returns an {@link EdgeCollection} instance for the new
     * edge collection.
     *
     * This is a convenience method for calling {@link Database.createCollection}
     * with `options.type` set to `EDGE_COLLECTION`.
     *
     * @param T - Type to use for edge document data. Defaults to `any`.
     * @param collectionName - Name of the new collection.
     * @param options - Options for creating the collection.
     *
     * @example
     * ```js
     * const db = new Database();
     * const edges = db.createEdgeCollection("friends");
     * ```
     *
     * @example
     * ```ts
     * interface Friend {
     *   startDate: number;
     *   endDate?: number;
     * }
     * const db = new Database();
     * const edges = db.createEdgeCollection<Friend>("friends");
     * ```
     */
    async createEdgeCollection(collectionName, options) {
        return this.createCollection(collectionName, {
            ...options,
            type: collection_1.CollectionType.EDGE_COLLECTION,
        });
    }
    /**
     * Renames the collection `collectionName` to `newName`.
     *
     * Additionally removes any stored `Collection` instance for
     * `collectionName` from the `Database` instance's internal cache.
     *
     * **Note**: Renaming collections may not be supported when ArangoDB is
     * running in a cluster configuration.
     *
     * @param collectionName - Current name of the collection.
     * @param newName - The new name of the collection.
     */
    async renameCollection(collectionName, newName) {
        const result = await this.request({
            method: "PUT",
            path: `/_api/collection/${collectionName}/rename`,
            body: { name: newName },
        }, (res) => res.body);
        this._collections.delete(collectionName);
        return result;
    }
    /**
     * Fetches all collections from the database and returns an array of
     * collection descriptions.
     *
     * See also {@link Database.collections}.
     *
     * @param excludeSystem - Whether system collections should be excluded.
     *
     * @example
     * ```js
     * const db = new Database();
     * const collections = await db.listCollections();
     * // collections is an array of collection descriptions
     * // not including system collections
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * const collections = await db.listCollections(false);
     * // collections is an array of collection descriptions
     * // including system collections
     * ```
     */
    listCollections(excludeSystem = true) {
        return this.request({
            path: "/_api/collection",
            qs: { excludeSystem },
        }, (res) => res.body.result);
    }
    /**
     * Fetches all collections from the database and returns an array of
     * `Collection` instances.
     *
     * In TypeScript these instances implement both the
     * {@link DocumentCollection} and {@link EdgeCollection} interfaces and can
     * be cast to either type to enforce a stricter API.
     *
     * See also {@link Database.listCollections}.
     *
     * @param excludeSystem - Whether system collections should be excluded.
     *
     * @example
     * ```js
     * const db = new Database();
     * const collections = await db.collections();
     * // collections is an array of DocumentCollection
     * // and EdgeCollection instances
     * // not including system collections
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * const collections = await db.collections(false);
     * // collections is an array of DocumentCollection
     * // and EdgeCollection instances
     * // including system collections
     * ```
     */
    async collections(excludeSystem = true) {
        const collections = await this.listCollections(excludeSystem);
        return collections.map((data) => this.collection(data.name));
    }
    //#endregion
    //#region graphs
    /**
     * Returns a {@link Graph} instance representing the graph with the given
     * `graphName`.
     *
     * @param graphName - Name of the graph.
     *
     * @example
     * ```js
     * const db = new Database();
     * const graph = db.graph("some-graph");
     * ```
     */
    graph(graphName) {
        if (!this._graphs.has(graphName)) {
            this._graphs.set(graphName, new graph_1.Graph(this, graphName));
        }
        return this._graphs.get(graphName);
    }
    /**
     * Creates a graph with the given `graphName` and `edgeDefinitions`, then
     * returns a {@link Graph} instance for the new graph.
     *
     * @param graphName - Name of the graph to be created.
     * @param edgeDefinitions - An array of edge definitions.
     * @param options - An object defining the properties of the graph.
     */
    async createGraph(graphName, edgeDefinitions, options) {
        const graph = this.graph(graphName);
        await graph.create(edgeDefinitions, options);
        return graph;
    }
    /**
     * Fetches all graphs from the database and returns an array of graph
     * descriptions.
     *
     * See also {@link Database.graphs}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const graphs = await db.listGraphs();
     * // graphs is an array of graph descriptions
     * ```
     */
    listGraphs() {
        return this.request({ path: "/_api/gharial" }, (res) => res.body.graphs);
    }
    /**
     * Fetches all graphs from the database and returns an array of {@link Graph}
     * instances for those graphs.
     *
     * See also {@link Database.listGraphs}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const graphs = await db.graphs();
     * // graphs is an array of Graph instances
     * ```
     */
    async graphs() {
        const graphs = await this.listGraphs();
        return graphs.map((data) => this.graph(data._key));
    }
    //#endregion
    //#region views
    /**
     * Returns an {@link ArangoSearchView} instance for the given `viewName`.
     *
     * @param viewName - Name of the ArangoSearch View.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("potatoes");
     * ```
     */
    view(viewName) {
        if (!this._views.has(viewName)) {
            this._views.set(viewName, new view_1.View(this, viewName));
        }
        return this._views.get(viewName);
    }
    /**
     * Creates a new ArangoSearch View with the given `viewName` and `options`
     * and returns an {@link ArangoSearchView} instance for the created View.
     *
     * @param viewName - Name of the ArangoSearch View.
     * @param options - An object defining the properties of the View.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = await db.createView("potatoes");
     * // the ArangoSearch View "potatoes" now exists
     * ```
     */
    async createView(viewName, options) {
        const view = this.view(viewName);
        await view.create({ ...options, type: view_1.ViewType.ARANGOSEARCH_VIEW });
        return view;
    }
    /**
     * Renames the view `viewName` to `newName`.
     *
     * Additionally removes any stored {@link View} instance for `viewName` from
     * the `Database` instance's internal cache.
     *
     * **Note**: Renaming views may not be supported when ArangoDB is running in
     * a cluster configuration.
     *
     * @param viewName - Current name of the view.
     * @param newName - The new name of the view.
     */
    async renameView(viewName, newName) {
        const result = await this.request({
            method: "PUT",
            path: `/_api/view/${viewName}/rename`,
            body: { name: newName },
        }, (res) => res.body);
        this._views.delete(viewName);
        return result;
    }
    /**
     * Fetches all Views from the database and returns an array of View
     * descriptions.
     *
     * See also {@link Database.views}.
     *
     * @example
     * ```js
     * const db = new Database();
     *
     * const views = await db.listViews();
     * // views is an array of View descriptions
     * ```
     */
    listViews() {
        return this.request({ path: "/_api/view" }, (res) => res.body.result);
    }
    /**
     * Fetches all Views from the database and returns an array of
     * {@link ArangoSearchView} instances for the Views.
     *
     * See also {@link Database.listViews}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const views = await db.views();
     * // views is an array of ArangoSearch View instances
     * ```
     */
    async views() {
        const views = await this.listViews();
        return views.map((data) => this.view(data.name));
    }
    //#endregion
    //#region analyzers
    /**
     * Returns an {@link Analyzer} instance representing the Analyzer with the
     * given `analyzerName`.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = db.analyzer("some-analyzer");
     * const info = await analyzer.get();
     * ```
     */
    analyzer(analyzerName) {
        if (!this._analyzers.has(analyzerName)) {
            this._analyzers.set(analyzerName, new analyzer_1.Analyzer(this, analyzerName));
        }
        return this._analyzers.get(analyzerName);
    }
    /**
     * Creates a new Analyzer with the given `analyzerName` and `options`, then
     * returns an {@link Analyzer} instance for the new Analyzer.
     *
     * @param analyzerName - Name of the Analyzer.
     * @param options - An object defining the properties of the Analyzer.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = await db.createAnalyzer("potatoes", { type: "identity" });
     * // the identity Analyzer "potatoes" now exists
     * ```
     */
    async createAnalyzer(analyzerName, options) {
        const analyzer = this.analyzer(analyzerName);
        await analyzer.create(options);
        return analyzer;
    }
    /**
     * Fetches all Analyzers visible in the database and returns an array of
     * Analyzer descriptions.
     *
     * See also {@link Database.analyzers}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzers = await db.listAnalyzers();
     * // analyzers is an array of Analyzer descriptions
     * ```
     */
    listAnalyzers() {
        return this.request({ path: "/_api/analyzer" }, (res) => res.body.result);
    }
    /**
     * Fetches all Analyzers visible in the database and returns an array of
     * {@link Analyzer} instances for those Analyzers.
     *
     * See also {@link Database.listAnalyzers}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzers = await db.analyzers();
     * // analyzers is an array of Analyzer instances
     * ```
     */
    async analyzers() {
        const analyzers = await this.listAnalyzers();
        return analyzers.map((data) => this.analyzer(data.name));
    }
    executeTransaction(collections, action, options) {
        return this.request({
            method: "POST",
            path: "/_api/transaction",
            body: {
                collections: coerceTransactionCollections(collections),
                action,
                ...options,
            },
        }, (res) => res.body.result);
    }
    /**
     * Returns a {@link Transaction} instance for an existing streaming
     * transaction with the given `id`.
     *
     * See also {@link Database.beginTransaction}.
     *
     * @param id - The `id` of an existing stream transaction.
     *
     * @example
     * ```js
     * const trx1 = await db.beginTransaction(collections);
     * const id = trx1.id;
     * // later
     * const trx2 = db.transaction(id);
     * await trx2.commit();
     * ```
     */
    transaction(transactionId) {
        return new transaction_1.Transaction(this, transactionId);
    }
    beginTransaction(collections, options) {
        return this.request({
            method: "POST",
            path: "/_api/transaction/begin",
            body: {
                collections: coerceTransactionCollections(collections),
                ...options,
            },
        }, (res) => new transaction_1.Transaction(this, res.body.result.id));
    }
    /**
     * Fetches all active transactions from the database and returns an array of
     * transaction descriptions.
     *
     * See also {@link Database.transactions}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const transactions = await db.listTransactions();
     * // transactions is an array of transaction descriptions
     * ```
     */
    listTransactions() {
        return this._connection.request({ path: "/_api/transaction" }, (res) => res.body.transactions);
    }
    /**
     * Fetches all active transactions from the database and returns an array of
     * {@link Transaction} instances for those transactions.
     *
     * See also {@link Database.listTransactions}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const transactions = await db.transactions();
     * // transactions is an array of transactions
     * ```
     */
    async transactions() {
        const transactions = await this.listTransactions();
        return transactions.map((data) => this.transaction(data.id));
    }
    query(query, bindVars, options) {
        if (aql_1.isAqlQuery(query)) {
            options = bindVars;
            bindVars = query.bindVars;
            query = query.query;
        }
        else if (aql_1.isAqlLiteral(query)) {
            query = query.toAQL();
        }
        const { allowDirtyRead, count, batchSize, cache, memoryLimit, ttl, timeout, ...opts } = options || {};
        return this.request({
            method: "POST",
            path: "/_api/cursor",
            body: {
                query,
                bindVars,
                count,
                batchSize,
                cache,
                memoryLimit,
                ttl,
                options: opts,
            },
            allowDirtyRead,
            timeout,
        }, (res) => new cursor_1.BatchedArrayCursor(this, res.body, res.arangojsHostId, allowDirtyRead).items);
    }
    explain(query, bindVars, options) {
        if (aql_1.isAqlQuery(query)) {
            options = bindVars;
            bindVars = query.bindVars;
            query = query.query;
        }
        else if (aql_1.isAqlLiteral(query)) {
            query = query.toAQL();
        }
        return this.request({
            method: "POST",
            path: "/_api/explain",
            body: { query, bindVars, options },
        }, (res) => res.body);
    }
    /**
     * Parses the given query and returns the result.
     *
     * See the {@link aql} template string handler for information about how
     * to create a query string without manually defining bind parameters nor
     * having to worry about escaping variables.
     *
     * @param query - An AQL query string or an object containing an AQL query
     * string and bind parameters, e.g. the object returned from an {@link aql}
     * template string.
     *
     * @example
     * ```js
     * const db = new Database();
     * const collection = db.collection("some-collection");
     * const ast = await db.parse(aql`
     *   FOR doc IN ${collection}
     *   FILTER doc.flavor == "strawberry"
     *   RETURN doc._key
     * `);
     * ```
     */
    parse(query) {
        if (aql_1.isAqlQuery(query)) {
            query = query.query;
        }
        else if (aql_1.isAqlLiteral(query)) {
            query = query.toAQL();
        }
        return this.request({
            method: "POST",
            path: "/_api/query",
            body: { query },
        }, (res) => res.body);
    }
    queryTracking(options) {
        return this.request(options
            ? {
                method: "PUT",
                path: "/_api/query/properties",
                body: options,
            }
            : {
                method: "GET",
                path: "/_api/query/properties",
            }, (res) => res.body);
    }
    /**
     * Fetches a list of information for all currently running queries.
     *
     * See also {@link Database.listSlowQueries} and {@link Database.killQuery}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const queries = await db.listRunningQueries();
     * ```
     */
    listRunningQueries() {
        return this.request({
            method: "GET",
            path: "/_api/query/current",
        }, (res) => res.body);
    }
    /**
     * Fetches a list of information for all recent slow queries.
     *
     * See also {@link Database.listRunningQueries} and
     * {@link Database.clearSlowQueries}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const queries = await db.listSlowQueries();
     * // Only works if slow query tracking is enabled
     * ```
     */
    listSlowQueries() {
        return this.request({
            method: "GET",
            path: "/_api/query/slow",
        }, (res) => res.body);
    }
    /**
     * Clears the list of recent slow queries.
     *
     * See also {@link Database.listSlowQueries}.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.clearSlowQueries();
     * // Slow query list is now cleared
     * ```
     */
    clearSlowQueries() {
        return this.request({
            method: "DELETE",
            path: "/_api/query/slow",
        }, () => undefined);
    }
    /**
     * Kills a running query with the given `queryId`.
     *
     * See also {@link Database.listRunningQueries}.
     *
     * @param queryId - The ID of a currently running query.
     *
     * @example
     * ```js
     * const db = new Database();
     * const queries = await db.listRunningQueries();
     * await Promise.all(queries.map(
     *   async (query) => {
     *     if (query.state === "executing") {
     *       await db.killQuery(query.id);
     *     }
     *   }
     * ));
     * ```
     */
    killQuery(queryId) {
        return this.request({
            method: "DELETE",
            path: `/_api/query/${queryId}`,
        }, () => undefined);
    }
    //#endregion
    //#region functions
    /**
     * Fetches a list of all AQL user functions registered with the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const functions = await db.listFunctions();
     * const names = functions.map(fn => fn.name);
     * ```
     */
    listFunctions() {
        return this.request({ path: "/_api/aqlfunction" }, (res) => res.body.result);
    }
    /**
     * Creates an AQL user function with the given _name_ and _code_ if it does
     * not already exist or replaces it if a function with the same name already
     * existed.
     *
     * @param name - A valid AQL function name. The function name must consist
     * of at least two alphanumeric identifiers separated with double colons.
     * @param code - A string evaluating to a JavaScript function (not a
     * JavaScript function object).
     * @param isDeterministic - If set to `true`, the function is expected to
     * always return the same result for equivalent inputs. This option currently
     * has no effect but may allow for optimizations in the future.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.createFunction(
     *   "ACME::ACCOUNTING::CALCULATE_VAT",
     *   "(price) => price * 0.19"
     * );
     * // Use the new function in an AQL query with template handler:
     * const cursor = await db.query(aql`
     *   FOR product IN products
     *   RETURN MERGE(
     *     { vat: ACME::ACCOUNTING::CALCULATE_VAT(product.price) },
     *     product
     *   )
     * `);
     * // cursor is a cursor for the query result
     * ```
     */
    createFunction(name, code, isDeterministic = false) {
        return this.request({
            method: "POST",
            path: "/_api/aqlfunction",
            body: { name, code, isDeterministic },
        }, (res) => res.body);
    }
    /**
     * Deletes the AQL user function with the given name from the database.
     *
     * @param name - The name of the user function to drop.
     * @param group - If set to `true`, all functions with a name starting with
     * `name` will be deleted, otherwise only the function with the exact name
     * will be deleted.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.dropFunction("ACME::ACCOUNTING::CALCULATE_VAT");
     * // the function no longer exists
     * ```
     */
    dropFunction(name, group = false) {
        return this.request({
            method: "DELETE",
            path: `/_api/aqlfunction/${name}`,
            qs: { group },
        }, (res) => res.body);
    }
    //#endregion
    //#region services
    /**
     * Fetches a list of all installed service.
     *
     * @param excludeSystem - Whether system services should be excluded.
     *
     * @example
     * ```js
     * const db = new Database();
     * const services = await db.listServices();
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * const services = await db.listServices(false); // all services
     * ```
     */
    listServices(excludeSystem = true) {
        return this.request({
            path: "/_api/foxx",
            qs: { excludeSystem },
        }, (res) => res.body);
    }
    /**
     * Installs a new service.
     *
     * @param mount - The service's mount point, relative to the database.
     * @param source - The service bundle to install.
     * @param options - Options for installing the service.
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js file stream as source
     * const source = fs.createReadStream("./my-foxx-service.zip");
     * const info = await db.installService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js Buffer as source
     * const source = fs.readFileSync("./my-foxx-service.zip");
     * const info = await db.installService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a File (Blob) from a browser file input
     * const element = document.getElementById("my-file-input");
     * const source = element.files[0];
     * const info = await db.installService("/hello", source);
     * ```
     */
    async installService(mount, source, options = {}) {
        const { configuration, dependencies, ...qs } = options;
        const req = await multipart_1.toForm({
            configuration,
            dependencies,
            source,
        });
        return await this.request({
            ...req,
            method: "POST",
            path: "/_api/foxx",
            isBinary: true,
            qs: { ...qs, mount },
        }, (res) => res.body);
    }
    /**
     * Replaces an existing service with a new service by completely removing the
     * old service and installing a new service at the same mount point.
     *
     * @param mount - The service's mount point, relative to the database.
     * @param source - The service bundle to install.
     * @param options - Options for replacing the service.
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js file stream as source
     * const source = fs.createReadStream("./my-foxx-service.zip");
     * const info = await db.replaceService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js Buffer as source
     * const source = fs.readFileSync("./my-foxx-service.zip");
     * const info = await db.replaceService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a File (Blob) from a browser file input
     * const element = document.getElementById("my-file-input");
     * const source = element.files[0];
     * const info = await db.replaceService("/hello", source);
     * ```
     */
    async replaceService(mount, source, options = {}) {
        const { configuration, dependencies, ...qs } = options;
        const req = await multipart_1.toForm({
            configuration,
            dependencies,
            source,
        });
        return await this.request({
            ...req,
            method: "PUT",
            path: "/_api/foxx/service",
            isBinary: true,
            qs: { ...qs, mount },
        }, (res) => res.body);
    }
    /**
     * Replaces an existing service with a new service while retaining the old
     * service's configuration and dependencies.
     *
     * @param mount - The service's mount point, relative to the database.
     * @param source - The service bundle to install.
     * @param options - Options for upgrading the service.
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js file stream as source
     * const source = fs.createReadStream("./my-foxx-service.zip");
     * const info = await db.upgradeService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a node.js Buffer as source
     * const source = fs.readFileSync("./my-foxx-service.zip");
     * const info = await db.upgradeService("/hello", source);
     * ```
     *
     * @example
     * ```js
     * const db = new Database();
     * // Using a File (Blob) from a browser file input
     * const element = document.getElementById("my-file-input");
     * const source = element.files[0];
     * const info = await db.upgradeService("/hello", source);
     * ```
     */
    async upgradeService(mount, source, options = {}) {
        const { configuration, dependencies, ...qs } = options;
        const req = await multipart_1.toForm({
            configuration,
            dependencies,
            source,
        });
        return await this.request({
            ...req,
            method: "PATCH",
            path: "/_api/foxx/service",
            isBinary: true,
            qs: { ...qs, mount },
        }, (res) => res.body);
    }
    /**
     * Completely removes a service from the database.
     *
     * @param mount - The service's mount point, relative to the database.
     * @param options - Options for uninstalling the service.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.uninstallService("/my-foxx");
     * ```
     */
    uninstallService(mount, options) {
        return this.request({
            method: "DELETE",
            path: "/_api/foxx/service",
            qs: { ...options, mount },
        }, () => undefined);
    }
    /**
     * Retrieves information about a mounted service.
     *
     * @param mount - The service's mount point, relative to the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const info = await db.getService("/my-service");
     * // info contains detailed information about the service
     * ```
     */
    getService(mount) {
        return this.request({
            path: "/_api/foxx/service",
            qs: { mount },
        }, (res) => res.body);
    }
    async getServiceConfiguration(mount, minimal = false) {
        const result = await this.request({
            path: "/_api/foxx/configuration",
            qs: { mount, minimal },
        }, (res) => res.body);
        if (!minimal ||
            !Object.keys(result).every((key) => result[key].title)) {
            return result;
        }
        const values = {};
        for (const key of Object.keys(result)) {
            values[key] = result[key].current;
        }
        return values;
    }
    async replaceServiceConfiguration(mount, cfg, minimal = false) {
        const result = await this.request({
            method: "PUT",
            path: "/_api/foxx/configuration",
            body: cfg,
            qs: { mount, minimal },
        }, (res) => res.body);
        if (minimal ||
            !result.values ||
            !Object.keys(result.values).every((key) => result.values[key].title)) {
            return result;
        }
        const result2 = (await this.getServiceConfiguration(mount, false));
        if (result.warnings) {
            for (const key of Object.keys(result2)) {
                result2[key].warning = result.warnings[key];
            }
        }
        return result2;
    }
    async updateServiceConfiguration(mount, cfg, minimal = false) {
        const result = await this.request({
            method: "PATCH",
            path: "/_api/foxx/configuration",
            body: cfg,
            qs: { mount, minimal },
        }, (res) => res.body);
        if (minimal ||
            !result.values ||
            !Object.keys(result.values).every((key) => result.values[key].title)) {
            return result;
        }
        const result2 = (await this.getServiceConfiguration(mount, false));
        if (result.warnings) {
            for (const key of Object.keys(result2)) {
                result2[key].warning = result.warnings[key];
            }
        }
        return result2;
    }
    async getServiceDependencies(mount, minimal = false) {
        const result = await this.request({
            path: "/_api/foxx/dependencies",
            qs: { mount, minimal },
        }, (res) => res.body);
        if (!minimal ||
            !Object.keys(result).every((key) => result[key].title))
            return result;
        const values = {};
        for (const key of Object.keys(result)) {
            values[key] = result[key].current;
        }
        return values;
    }
    async replaceServiceDependencies(mount, deps, minimal = false) {
        const result = await this.request({
            method: "PUT",
            path: "/_api/foxx/dependencies",
            body: deps,
            qs: { mount, minimal },
        }, (res) => res.body);
        if (minimal ||
            !result.values ||
            !Object.keys(result.values).every((key) => result.values[key].title)) {
            return result;
        }
        // Work around "minimal" flag not existing in 3.3
        const result2 = (await this.getServiceDependencies(mount, false));
        if (result.warnings) {
            for (const key of Object.keys(result2)) {
                result2[key].warning = result.warnings[key];
            }
        }
        return result2;
    }
    async updateServiceDependencies(mount, deps, minimal = false) {
        const result = await this.request({
            method: "PATCH",
            path: "/_api/foxx/dependencies",
            body: deps,
            qs: { mount, minimal },
        }, (res) => res.body);
        if (minimal ||
            !result.values ||
            !Object.keys(result.values).every((key) => result.values[key].title)) {
            return result;
        }
        // Work around "minimal" flag not existing in 3.3
        const result2 = (await this.getServiceDependencies(mount, false));
        if (result.warnings) {
            for (const key of Object.keys(result2)) {
                result2[key].warning = result.warnings[key];
            }
        }
        return result2;
    }
    /**
     * Enables or disables development mode for the given service.
     *
     * @param mount - The service's mount point, relative to the database.
     * @param enabled - Whether development mode should be enabled or disabled.
     *
     * @example
     * ```js
     * const db = new Database();
     * await db.setServiceDevelopmentMode("/my-service", true);
     * // the service is now in development mode
     * await db.setServiceDevelopmentMode("/my-service", false);
     * // the service is now in production mode
     * ```
     */
    setServiceDevelopmentMode(mount, enabled = true) {
        return this.request({
            method: enabled ? "POST" : "DELETE",
            path: "/_api/foxx/development",
            qs: { mount },
        }, (res) => res.body);
    }
    /**
     * Retrieves a list of scripts defined in the service manifest's "scripts"
     * section mapped to their human readable representations.
     *
     * @param mount - The service's mount point, relative to the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const scripts = await db.listServiceScripts("/my-service");
     * for (const [name, title] of Object.entries(scripts)) {
     *   console.log(`${name}: ${title}`);
     * }
     * ```
     */
    listServiceScripts(mount) {
        return this.request({
            path: "/_api/foxx/scripts",
            qs: { mount },
        }, (res) => res.body);
    }
    /**
     * Executes a service script and retrieves its result exposed as
     * `module.exports` (if any).
     *
     * @param mount - The service's mount point, relative to the database.
     * @param name - Name of the service script to execute as defined in the
     * service manifest.
     * @param params - Arbitrary value that will be exposed to the script as
     * `argv[0]` in the service context (e.g. `module.context.argv[0]`).
     * Must be serializable to JSON.
     *
     * @example
     * ```js
     * const db = new Database();
     * const result = await db.runServiceScript(
     *   "/my-service",
     *   "create-user",
     *   {
     *     username: "service_admin",
     *     password: "hunter2"
     *   }
     * );
     * ```
     */
    runServiceScript(mount, name, params) {
        return this.request({
            method: "POST",
            path: `/_api/foxx/scripts/${name}`,
            body: params,
            qs: { mount },
        }, (res) => res.body);
    }
    runServiceTests(mount, options) {
        return this.request({
            method: "POST",
            path: "/_api/foxx/tests",
            qs: {
                ...options,
                mount,
            },
        }, (res) => res.body);
    }
    /**
     * Retrieves the text content of the service's `README` or `README.md` file.
     *
     * Returns `undefined` if no such file could be found.
     *
     * @param mount - The service's mount point, relative to the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const readme = await db.getServiceReadme("/my-service");
     * if (readme !== undefined) console.log(readme);
     * else console.warn(`No README found.`)
     * ```
     */
    getServiceReadme(mount) {
        return this.request({
            path: "/_api/foxx/readme",
            qs: { mount },
        }, (res) => res.body);
    }
    /**
     * Retrieves an Open API compatible Swagger API description object for the
     * service installed at the given mount point.
     *
     * @param mount - The service's mount point, relative to the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const spec = await db.getServiceDocumentation("/my-service");
     * // spec is a Swagger API description of the service
     * ```
     */
    getServiceDocumentation(mount) {
        return this.request({
            path: "/_api/foxx/swagger",
            qs: { mount },
        }, (res) => res.body);
    }
    /**
     * Retrieves a zip bundle containing the service files.
     *
     * Returns a `Buffer` in node.js or `Blob` in the browser.
     *
     * @param mount - The service's mount point, relative to the database.
     *
     * @example
     * ```js
     * const db = new Database();
     * const serviceBundle = await db.downloadService("/my-foxx");
     * ```
     */
    downloadService(mount) {
        return this.request({
            method: "POST",
            path: "/_api/foxx/download",
            qs: { mount },
            expectBinary: true,
        }, (res) => res.body);
    }
    /**
     * Writes all locally available services to the database and updates any
     * service bundles missing in the database.
     *
     * @param replace - If set to `true`, outdated services will also be
     * committed. This can be used to solve some consistency problems when
     * service bundles are missing in the database or were deleted manually.
     *
     * @example
     * ```js
     * await db.commitLocalServiceState();
     * // all services available on the coordinator have been written to the db
     * ```
     *
     * @example
     * ```js
     * await db.commitLocalServiceState(true);
     * // all service conflicts have been resolved in favor of this coordinator
     * ```
     */
    commitLocalServiceState(replace = false) {
        return this.request({
            method: "POST",
            path: "/_api/foxx/commit",
            qs: { replace },
        }, () => undefined);
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map