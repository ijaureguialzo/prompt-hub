require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Prompt = require('../models/Prompt');

// Seed demo content for ONE user (never touches other users' data).
//
// Usage:
//   SEED_USER_EMAIL=you@example.com node src/scripts/seedData.js
//
// Idempotent: categories are tagged with a [demo] marker in their name;
// if they already exist the script reports and exits without writing.

const DEMO_MARKER = '[demo]';

// Content is deliberately language-neutral; the UI handles i18n.
const DEMO_CATEGORIES = [
  { name: `${DEMO_MARKER} Coding`, description: 'Prompts for development tasks' },
  { name: `${DEMO_MARKER} Marketing`, description: 'Copy, campaigns and SEO' },
  { name: `${DEMO_MARKER} Education`, description: 'Teaching and learning aids' },
  { name: `${DEMO_MARKER} Writing`, description: 'Editing, tone and structure' }
];

const DEMO_PROMPTS = [
  {
    title: 'Explain code',
    content:
      'Explain the following code to a junior developer. Cover what it does, the key data structures, and common pitfalls:\n\n```{{code}}```',
    category: 0,
    tags: ['coding', 'explanation']
  },
  {
    title: 'Code review checklist',
    content:
      'Act as a senior engineer reviewing this pull request. Check for: correctness, security issues (injection, authz), performance regressions, readability, and missing tests. List findings by severity.\n\n```{{diff}}```',
    category: 0,
    tags: ['coding', 'review']
  },
  {
    title: 'Unit test generator',
    content:
      'Write unit tests for the function below. Cover the happy path, edge cases (empty input, nulls, boundary values) and at least one failure case. Use the project existing test framework.\n\n```{{function}}```',
    category: 0,
    tags: ['coding', 'testing']
  },
  {
    title: 'Product launch email',
    content:
      'Write a 150-word launch email for {{product}}. Tone: confident, friendly, no hype. One clear call to action. Include a subject line option A/B pair.',
    category: 1,
    tags: ['marketing', 'email']
  },
  {
    title: 'SEO meta description',
    content:
      'Write three 150-character meta description variants for this page. Each must include the primary keyword naturally and end with a verb.\n\nPage: {{url}}\nKeyword: {{keyword}}',
    category: 1,
    tags: ['marketing', 'seo']
  },
  {
    title: 'Feynman technique lesson',
    content:
      'Teach {{topic}} using the Feynman technique: explain it in plain language as if to a 12-year-old, use one analogy, then quiz me with three questions of increasing difficulty.',
    category: 2,
    tags: ['education', 'learning']
  },
  {
    title: 'Socratic tutor',
    content:
      'I want to learn {{topic}}. Do not give me the answer. Ask me one question at a time, wait for my answer, give feedback, then ask the next. Adapt the difficulty to my responses.',
    category: 2,
    tags: ['education', 'socratic']
  },
  {
    title: 'Tone rewriter',
    content:
      'Rewrite the text below to sound {{tone}} while preserving every factual claim. Keep the same length (±10%). Flag any sentence you had to change for clarity.\n\n{{text}}',
    category: 3,
    tags: ['writing', 'editing']
  },
  {
    title: 'Structure critique',
    content:
      'Critique the structure of this document: does each section earn its place? Suggest a reordered outline with one-line justifications, then list what to cut.\n\n{{document}}',
    category: 3,
    tags: ['writing', 'structure']
  }
];

async function seedData() {
  const email = process.env.SEED_USER_EMAIL;
  if (!email) {
    console.error('Usage: SEED_USER_EMAIL=you@example.com node src/scripts/seedData.js');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb');
  console.log('Connected to MongoDB');

  const owner = await User.findOne({ email: email.toLowerCase().trim() });
  if (!owner) {
    console.error(`No user found with email ${email} — register/login first.`);
    process.exit(1);
  }

  // Idempotency check
  const existing = await Category.findOne({
    name: { $regex: `${DEMO_MARKER}` },
    ownerId: owner._id
  });
  if (existing) {
    console.log(`Demo content already exists for ${owner.email} (found "${existing.name}") — nothing to do.`);
    process.exit(0);
  }

  console.log(`Seeding demo content for ${owner.email}...`);

  const categories = [];
  for (const def of DEMO_CATEGORIES) {
    categories.push(
      await Category.create({ ...def, name: def.name, ownerId: owner._id })
    );
  }

  const prompts = [];
  for (const def of DEMO_PROMPTS) {
    prompts.push(
      await Prompt.create({
        title: def.title,
        content: def.content,
        categoryId: categories[def.category]._id,
        ownerId: owner._id,
        tags: def.tags
      })
    );
  }

  console.log(`Done: ${categories.length} categories, ${prompts.length} prompts.`);
  console.log('Note: demo items are marked with a [demo] prefix so you can find (and delete) them.');

  process.exit(0);
}

seedData().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
