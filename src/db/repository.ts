import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { users, projects, threads, documents } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserWorkspaceData(uid: string) {
  try {
    const [userProjects, userThreads, userDocs] = await Promise.all([
      db.select().from(projects).where(eq(projects.userUid, uid)).orderBy(desc(projects.updatedAt)),
      db.select().from(threads).where(eq(threads.userUid, uid)).orderBy(desc(threads.updatedAt)),
      db.select().from(documents).where(eq(documents.userUid, uid)).orderBy(desc(documents.createdAt)),
    ]);

    return {
      projects: userProjects,
      threads: userThreads,
      documents: userDocs,
    };
  } catch (error) {
    console.error('Database query failed in getUserWorkspaceData:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertUserThread(params: {
  id: string;
  userUid: string;
  projectId?: string | null;
  title: string;
  modelId: string;
  styleId: string;
  extendedThinking: boolean;
  starred: boolean;
  messagesJson: string;
}) {
  try {
    const result = await db
      .insert(threads)
      .values({
        id: params.id,
        userUid: params.userUid,
        projectId: params.projectId || null,
        title: params.title,
        modelId: params.modelId,
        styleId: params.styleId,
        extendedThinking: params.extendedThinking,
        starred: params.starred,
        messagesJson: params.messagesJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: threads.id,
        set: {
          projectId: params.projectId || null,
          title: params.title,
          modelId: params.modelId,
          styleId: params.styleId,
          extendedThinking: params.extendedThinking,
          starred: params.starred,
          messagesJson: params.messagesJson,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertUserThread:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function deleteUserThreadById(id: string) {
  try {
    await db.delete(threads).where(eq(threads.id, id));
  } catch (error) {
    console.error('Database query failed in deleteUserThreadById:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertUserProject(params: {
  id: string;
  userUid: string;
  name: string;
  description: string;
  customInstructions: string;
  knowledgeDocsJson: string;
  starred?: boolean;
}) {
  try {
    const result = await db
      .insert(projects)
      .values({
        id: params.id,
        userUid: params.userUid,
        name: params.name,
        description: params.description,
        customInstructions: params.customInstructions,
        knowledgeDocsJson: params.knowledgeDocsJson,
        starred: Boolean(params.starred),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projects.id,
        set: {
          name: params.name,
          description: params.description,
          customInstructions: params.customInstructions,
          knowledgeDocsJson: params.knowledgeDocsJson,
          starred: Boolean(params.starred),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertUserProject:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function insertUserDocument(params: {
  userUid: string;
  filename: string;
  mimeType: string;
  pageCount: number;
  extractedText: string;
  summary?: string;
}) {
  try {
    const result = await db
      .insert(documents)
      .values({
        userUid: params.userUid,
        filename: params.filename,
        mimeType: params.mimeType,
        pageCount: params.pageCount,
        extractedText: params.extractedText,
        summary: params.summary || null,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in insertUserDocument:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
