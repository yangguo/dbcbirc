import { MongoClient, Db, Collection } from 'mongodb'

if (!process.env.MONGODB_URI) {
  // During build time, we don't need to connect to MongoDB
  console.warn('Warning: MONGODB_URI environment variable is not set')
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise!
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise
  return client.db(process.env.MONGODB_DB || 'cbirc')
}

export async function getCollection(collectionName: string): Promise<Collection> {
  const db = await getDatabase()
  return db.collection(collectionName)
}