from __future__ import annotations

from sqlalchemy import func, select

from database import SessionLocal
from models import Job

SEED_JOBS = [
    {
        "title": "Senior Frontend Engineer",
        "company": "Vercel",
        "location": "Remote",
        "type": "Full-time",
        "description": "Build and optimize the Vercel frontend platform.",
        "requirements": [
            "5+ years of experience with modern frontend frameworks",
            "Expertise in React and TypeScript",
            "Experience with performance optimization",
        ],
        "skills_required": ["react", "typescript", "next.js"],
        "optional_skills": ["node.js", "graphql"],
        "experience_level": "senior",
        "salary_range": "$180k - $230k",
        "posted_at": "2 days ago",
        "source_url": "https://vercel.com/careers/frontend",
        "source_name": "Cached",
        "is_live": False,
        "external_id": "seed-1",
    },
    {
        "title": "Product Engineer",
        "company": "Linear",
        "location": "Remote",
        "type": "Full-time",
        "description": "Ship product features with a focus on quality and speed.",
        "requirements": [
            "3+ years building product-focused features",
            "Experience with TypeScript and React",
            "Comfortable across the stack",
        ],
        "skills_required": ["react", "typescript", "node.js"],
        "optional_skills": ["graphql", "design systems"],
        "experience_level": "mid",
        "salary_range": "$160k - $210k",
        "posted_at": "3 days ago",
        "source_url": "https://linear.app/careers/product-engineer",
        "source_name": "Cached",
        "is_live": False,
        "external_id": "seed-2",
    },
    {
        "title": "Senior Software Engineer, Core",
        "company": "Airbnb",
        "location": "San Francisco, CA",
        "type": "Hybrid",
        "description": "Work on core platform services with high reliability demands.",
        "requirements": [
            "5+ years backend experience",
            "Experience with distributed systems",
            "Strong coding skills in at least one backend language",
        ],
        "skills_required": ["java", "python", "distributed systems"],
        "optional_skills": ["kubernetes", "aws"],
        "experience_level": "senior",
        "salary_range": "$200k - $260k",
        "posted_at": "5 days ago",
        "source_url": "https://airbnb.com/careers/core",
        "source_name": "Cached",
        "is_live": False,
        "external_id": "seed-3",
    },
    {
        "title": "Backend Engineer",
        "company": "Stripe",
        "location": "Dublin, Ireland",
        "type": "Hybrid",
        "description": "Design and build reliable payment services.",
        "requirements": [
            "3+ years backend experience",
            "Experience with APIs and databases",
            "Strong communication skills",
        ],
        "skills_required": ["go", "java", "postgresql"],
        "optional_skills": ["kubernetes", "aws"],
        "experience_level": "mid",
        "salary_range": "$180k - $230k",
        "posted_at": "1 week ago",
        "source_url": "https://stripe.com/careers/backend",
        "source_name": "Cached",
        "is_live": False,
        "external_id": "seed-4",
    },
]


async def seed_if_empty() -> None:
    async with SessionLocal() as session:
        count = await session.scalar(select(func.count()).select_from(Job))
        if count and count > 0:
            return

        for job in SEED_JOBS:
            session.add(Job(**job))
        await session.commit()
