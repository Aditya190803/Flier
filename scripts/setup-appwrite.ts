import { resolve } from "path";

import { config as dotenvConfig } from "dotenv";
import {
  Client,
  Databases,
  Storage,
  ID as _ID,
  Permission,
  Role,
} from "node-appwrite";

// Load environment variables from .env.local
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

// Configuration from environment - NO HARDCODED VALUES
const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
};

// Validate required config
if (
  !config.endpoint ||
  !config.projectId ||
  !config.apiKey ||
  !config.databaseId
) {
  console.error("❌ Missing required environment variables!");
  console.error("Please ensure .env.local contains:");
  console.error("  - NEXT_PUBLIC_APPWRITE_ENDPOINT");
  console.error("  - NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  console.error("  - APPWRITE_API_KEY");
  console.error("  - NEXT_PUBLIC_APPWRITE_DATABASE_ID");
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const storage = new Storage(client);

// Collection definitions
const collections = [
  {
    id: "contacts",
    name: "Contacts",
    attributes: [
      { key: "email", type: "string", size: 255, required: true },
      { key: "name", type: "string", size: 255, required: false },
      { key: "company", type: "string", size: 255, required: false },
      { key: "phone", type: "string", size: 50, required: false },
      { key: "tags", type: "string", size: 5000, required: false }, // JSON array of tags
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "email_idx", type: "key", attributes: ["email"] },
    ],
  },
  {
    id: "campaigns",
    name: "Campaigns",
    attributes: [
      { key: "subject", type: "string", size: 500, required: true },
      { key: "content", type: "string", size: 100000, required: false },
      { key: "recipients", type: "string", size: 1000000, required: false },
      { key: "sent", type: "integer", required: false, default: 0 },
      { key: "failed", type: "integer", required: false, default: 0 },
      { key: "status", type: "string", size: 50, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "campaign_type", type: "string", size: 50, required: false },
      { key: "attachments", type: "string", size: 100000, required: false },
      { key: "send_results", type: "string", size: 1000000, required: false },
      { key: "open_rate", type: "double", required: false, default: 0 },
      { key: "click_rate", type: "double", required: false, default: 0 },
      {
        key: "tracking_enabled",
        type: "boolean",
        required: false,
        default: true,
      },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "status_idx", type: "key", attributes: ["status"] },
      { key: "created_at_idx", type: "key", attributes: ["created_at"] },
    ],
  },
  {
    id: "templates",
    name: "Templates",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "subject", type: "string", size: 500, required: false },
      { key: "content", type: "string", size: 100000, required: false },
      { key: "category", type: "string", size: 50, required: false },
      { key: "version", type: "integer", required: false, default: 1 },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
      { key: "updated_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
    ],
  },
  {
    id: "template_versions",
    name: "Template Versions",
    attributes: [
      { key: "template_id", type: "string", size: 255, required: true },
      { key: "version", type: "integer", required: false, default: 1 },
      { key: "name", type: "string", size: 255, required: true },
      { key: "subject", type: "string", size: 500, required: false },
      { key: "content", type: "string", size: 100000, required: false },
      { key: "category", type: "string", size: 50, required: false },
      { key: "change_note", type: "string", size: 500, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "template_id_idx", type: "key", attributes: ["template_id"] },
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "version_idx", type: "key", attributes: ["version"] },
    ],
  },
  {
    id: "contact_groups",
    name: "Contact Groups",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "description", type: "string", size: 1000, required: false },
      { key: "color", type: "string", size: 20, required: false },
      { key: "contact_ids", type: "string", size: 100000, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
    ],
  },
  {
    id: "draft_emails",
    name: "Draft Emails",
    attributes: [
      { key: "subject", type: "string", size: 500, required: true },
      { key: "content", type: "string", size: 100000, required: false },
      { key: "recipients", type: "string", size: 1000000, required: false },
      { key: "saved_at", type: "string", size: 50, required: true },
      { key: "status", type: "string", size: 50, required: false },
      { key: "attachments", type: "string", size: 100000, required: false },
      { key: "csv_data", type: "string", size: 1000000, required: false },
      // JSON: { cc: string[], bcc: string[] } — single attr (collection size limit)
      { key: "cc", type: "string", size: 10000, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
      { key: "sent_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "status_idx", type: "key", attributes: ["status"] },
      { key: "saved_at_idx", type: "key", attributes: ["saved_at"] },
    ],
  },
  {
    id: "signatures",
    name: "Signatures",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "content", type: "string", size: 50000, required: false },
      { key: "is_default", type: "boolean", required: false, default: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      {
        key: "user_default_idx",
        type: "key",
        attributes: ["user_email", "is_default"],
      },
    ],
  },
  {
    id: "unsubscribes",
    name: "Unsubscribes",
    attributes: [
      { key: "email", type: "string", size: 255, required: true },
      { key: "reason", type: "string", size: 1000, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "unsubscribed_at", type: "string", size: 50, required: false },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "email_idx", type: "key", attributes: ["email"] },
      {
        key: "user_email_composite_idx",
        type: "key",
        attributes: ["user_email", "email"],
      },
    ],
  },
  {
    id: "webhooks",
    name: "Webhooks",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "url", type: "string", size: 2000, required: true },
      { key: "events", type: "string", size: 1000, required: false },
      { key: "is_active", type: "boolean", required: false, default: true },
      { key: "secret", type: "string", size: 255, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
      { key: "last_triggered", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
    ],
  },
  {
    id: "tracking_events",
    name: "Tracking Events",
    attributes: [
      { key: "campaign_id", type: "string", size: 255, required: true },
      { key: "recipient_id", type: "string", size: 255, required: false },
      { key: "link_id", type: "string", size: 255, required: false },
      { key: "email", type: "string", size: 255, required: true },
      { key: "event_type", type: "string", size: 50, required: true },
      { key: "link_url", type: "string", size: 2000, required: false },
      { key: "user_agent", type: "string", size: 1000, required: false },
      { key: "ip_address", type: "string", size: 50, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "campaign_id_idx", type: "key", attributes: ["campaign_id"] },
      { key: "recipient_id_idx", type: "key", attributes: ["recipient_id"] },
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "event_type_idx", type: "key", attributes: ["event_type"] },
    ],
  },
  {
    id: "ab_tests",
    name: "A/B Tests",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "status", type: "string", size: 50, required: false },
      { key: "test_type", type: "string", size: 50, required: false },
      { key: "variant_a_subject", type: "string", size: 500, required: false },
      {
        key: "variant_a_content",
        type: "string",
        size: 100000,
        required: false,
      },
      { key: "variant_b_subject", type: "string", size: 500, required: false },
      {
        key: "variant_b_content",
        type: "string",
        size: 100000,
        required: false,
      },
      {
        key: "variant_a_recipients",
        type: "string",
        size: 500000,
        required: false,
      },
      {
        key: "variant_b_recipients",
        type: "string",
        size: 500000,
        required: false,
      },
      { key: "variant_a_sent", type: "integer", required: false, default: 0 },
      { key: "variant_b_sent", type: "integer", required: false, default: 0 },
      { key: "variant_a_opens", type: "integer", required: false, default: 0 },
      { key: "variant_b_opens", type: "integer", required: false, default: 0 },
      { key: "variant_a_clicks", type: "integer", required: false, default: 0 },
      { key: "variant_b_clicks", type: "integer", required: false, default: 0 },
      { key: "winner", type: "string", size: 10, required: false },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "created_at", type: "string", size: 50, required: false },
      { key: "completed_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "status_idx", type: "key", attributes: ["status"] },
    ],
  },
  // Teams & Organization Support
  {
    id: "teams",
    name: "Teams",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "description", type: "string", size: 1000, required: false },
      { key: "owner_email", type: "string", size: 255, required: true },
      { key: "settings", type: "string", size: 4096, required: false }, // JSON string for team settings
      { key: "created_at", type: "string", size: 50, required: false },
      { key: "updated_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "owner_email_idx", type: "key", attributes: ["owner_email"] },
    ],
  },
  {
    id: "team_members",
    name: "Team Members",
    attributes: [
      { key: "team_id", type: "string", size: 255, required: true },
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "role", type: "string", size: 50, required: true }, // owner, admin, member, viewer
      { key: "permissions", type: "string", size: 5000, required: false }, // JSON array of permissions
      { key: "invited_by", type: "string", size: 255, required: false },
      { key: "joined_at", type: "string", size: 50, required: false },
      { key: "status", type: "string", size: 50, required: false }, // pending, active, removed
    ],
    indexes: [
      { key: "team_id_idx", type: "key", attributes: ["team_id"] },
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "role_idx", type: "key", attributes: ["role"] },
    ],
  },
  // GDPR & Compliance
  {
    id: "audit_logs",
    name: "Audit Logs",
    attributes: [
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "action", type: "string", size: 100, required: true }, // login, data_export, email_sent, settings_changed, etc.
      { key: "resource_type", type: "string", size: 100, required: false }, // contact, campaign, template, etc.
      { key: "resource_id", type: "string", size: 255, required: false },
      { key: "details", type: "string", size: 4096, required: false }, // JSON string with additional details
      { key: "ip_address", type: "string", size: 50, required: false },
      { key: "user_agent", type: "string", size: 1000, required: false },
      { key: "created_at", type: "string", size: 50, required: false },
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "action_idx", type: "key", attributes: ["action"] },
      { key: "created_at_idx", type: "key", attributes: ["created_at"] },
      { key: "resource_type_idx", type: "key", attributes: ["resource_type"] },
    ],
  },
  {
    id: "consents",
    name: "User Consents",
    attributes: [
      { key: "user_email", type: "string", size: 255, required: true },
      { key: "consent_type", type: "string", size: 100, required: true }, // email_tracking, data_analytics, marketing, data_retention
      { key: "granted", type: "boolean", required: false, default: false },
      { key: "granted_at", type: "string", size: 50, required: false },
      { key: "revoked_at", type: "string", size: 50, required: false },
      { key: "ip_address", type: "string", size: 50, required: false },
      { key: "source", type: "string", size: 100, required: false }, // signup, settings, api
    ],
    indexes: [
      { key: "user_email_idx", type: "key", attributes: ["user_email"] },
      { key: "consent_type_idx", type: "key", attributes: ["consent_type"] },
      {
        key: "user_consent_idx",
        type: "key",
        attributes: ["user_email", "consent_type"],
      },
    ],
  },
];

// Bucket definition
const bucketConfig = {
  id: "attachments",
  name: "Attachments",
  maximumFileSize: 25 * 1024 * 1024, // 25MB
  allowedFileExtensions: [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "zip",
    "rar",
    "zst",
    "tar",
    "gz",
    "7z",
  ],
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createDatabase() {
  console.log("\n📦 Creating database...");
  try {
    await databases.create(config.databaseId, config.databaseId);
    console.log(`✅ Database "${config.databaseId}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`ℹ️  Database "${config.databaseId}" already exists`);
    } else {
      throw error;
    }
  }
}

async function createCollection(collection: (typeof collections)[0]) {
  console.log(`\n📁 Creating collection: ${collection.name}...`);

  const permissions = [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];

  try {
    await databases.createCollection(
      config.databaseId,
      collection.id,
      collection.name,
      permissions,
    );
    console.log(`✅ Collection "${collection.name}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`ℹ️  Collection "${collection.name}" already exists`);
    } else {
      throw error;
    }
  }

  // Get existing attributes to avoid redundant calls
  const existingAttrs: string[] = await databases
    .listAttributes(config.databaseId, collection.id)
    .then((res) => res.attributes.map((a: any) => a.key))
    .catch(() => [] as string[]);

  // Create attributes in parallel
  const attrPromises = collection.attributes
    .filter((attr) => !existingAttrs.includes(attr.key))
    .map(async (attr) => {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            config.databaseId,
            collection.id,
            attr.key,
            attr.size!,
            attr.required,
            attr.default as string | undefined,
          );
        } else if (attr.type === "integer") {
          await databases.createIntegerAttribute(
            config.databaseId,
            collection.id,
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default as number | undefined,
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            config.databaseId,
            collection.id,
            attr.key,
            attr.required,
            attr.default as boolean | undefined,
          );
        } else if (attr.type === "double") {
          await databases.createFloatAttribute(
            config.databaseId,
            collection.id,
            attr.key,
            attr.required,
            undefined,
            undefined,
            attr.default as number | undefined,
          );
        }
        console.log(`  ✅ Attribute "${attr.key}" created`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute "${attr.key}" already exists`);
        } else {
          console.error(
            `  ❌ Failed to create attribute "${attr.key}":`,
            error.message,
          );
        }
      }
    });

  await Promise.all(attrPromises);

  // Wait for all attributes to be available
  console.log("  ⏳ Waiting for attributes to be available...");
  let allAvailable = false;
  let attempts = 0;
  while (!allAvailable && attempts < 30) {
    const result = await databases.listAttributes(
      config.databaseId,
      collection.id,
    );
    allAvailable = result.attributes.every(
      (attr: any) => attr.status === "available",
    );
    if (!allAvailable) {
      await sleep(1000);
      attempts++;
    }
  }

  // Get existing indexes
  const existingIndexes: string[] = await databases
    .listIndexes(config.databaseId, collection.id)
    .then((res) => res.indexes.map((i: any) => i.key))
    .catch(() => [] as string[]);

  // Create indexes
  for (const index of collection.indexes || []) {
    if (existingIndexes.includes(index.key)) {
      console.log(`  ℹ️  Index "${index.key}" already exists`);
      continue;
    }

    try {
      await databases.createIndex(
        config.databaseId,
        collection.id,
        index.key,
        index.type as any,
        index.attributes,
      );
      console.log(`  ✅ Index "${index.key}" created`);
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`  ℹ️  Index "${index.key}" already exists`);
      } else {
        console.error(
          `  ❌ Failed to create index "${index.key}":`,
          error.message,
        );
      }
    }
  }
}

async function createBucket() {
  console.log("\n🪣 Creating storage bucket...");
  try {
    await storage.createBucket(
      bucketConfig.id,
      bucketConfig.name,
      [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false, // fileSecurity
      true, // enabled
      bucketConfig.maximumFileSize,
      bucketConfig.allowedFileExtensions,
    );
    console.log(`✅ Bucket "${bucketConfig.name}" created`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`ℹ️  Bucket "${bucketConfig.name}" already exists`);
    } else {
      throw error;
    }
  }
}

async function generateEnvVariables() {
  console.log("\n📝 Environment variables to add to .env.local:\n");
  console.log("# Appwrite Collection IDs");
  console.log(`NEXT_PUBLIC_APPWRITE_CONTACTS_COLLECTION_ID=contacts`);
  console.log(`NEXT_PUBLIC_APPWRITE_CAMPAIGNS_COLLECTION_ID=campaigns`);
  console.log(`NEXT_PUBLIC_APPWRITE_TEMPLATES_COLLECTION_ID=templates`);
  console.log(
    `NEXT_PUBLIC_APPWRITE_TEMPLATE_VERSIONS_COLLECTION_ID=template_versions`,
  );
  console.log(
    `NEXT_PUBLIC_APPWRITE_CONTACT_GROUPS_COLLECTION_ID=contact_groups`,
  );
  console.log(`NEXT_PUBLIC_APPWRITE_DRAFT_EMAILS_COLLECTION_ID=draft_emails`);
  console.log(`NEXT_PUBLIC_APPWRITE_SIGNATURES_COLLECTION_ID=signatures`);
  console.log(`NEXT_PUBLIC_APPWRITE_UNSUBSCRIBES_COLLECTION_ID=unsubscribes`);
  console.log(`NEXT_PUBLIC_APPWRITE_WEBHOOKS_COLLECTION_ID=webhooks`);
  console.log(
    `NEXT_PUBLIC_APPWRITE_TRACKING_EVENTS_COLLECTION_ID=tracking_events`,
  );
  console.log(`NEXT_PUBLIC_APPWRITE_AB_TESTS_COLLECTION_ID=ab_tests`);
  console.log(`NEXT_PUBLIC_APPWRITE_ATTACHMENTS_BUCKET_ID=attachments`);
  console.log("");
  console.log("# Teams & Organization");
  console.log(`NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID=teams`);
  console.log(`NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID=team_members`);
  console.log("");
  console.log("# GDPR & Compliance");
  console.log(`NEXT_PUBLIC_APPWRITE_AUDIT_LOGS_COLLECTION_ID=audit_logs`);
  console.log(`NEXT_PUBLIC_APPWRITE_CONSENTS_COLLECTION_ID=consents`);
  console.log("");
}

async function main() {
  console.log("🚀 Appwrite Setup Script");
  console.log("========================");
  console.log(`Endpoint: ${config.endpoint}`);
  console.log(`Project: ${config.projectId}`);
  console.log(`Database: ${config.databaseId}`);

  if (!config.apiKey) {
    console.error("\n❌ APPWRITE_API_KEY is not set in environment variables");
    process.exit(1);
  }

  try {
    // Create database
    await createDatabase();

    // Create all collections
    for (const collection of collections) {
      await createCollection(collection);
    }

    // Create storage bucket
    await createBucket();

    // Generate env variables
    await generateEnvVariables();

    console.log("\n✅ Setup complete!");
    console.log(
      "\n⚠️  Remember to update your .env.local file with the collection IDs above.",
    );
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

main();
