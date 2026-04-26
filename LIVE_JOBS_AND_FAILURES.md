# Live Job Search & CV Failure Handling

This document describes the enhanced job search and CV analysis failure handling features.

## Live Job Search

### Architecture

The job search system uses a **pluggable source pattern** that allows multiple job sources to be added without coupling:

```typescript
interface JobSource {
  name: string;
  search(options: JobSearchOptions): Promise<Job[]>;
}
```

### Current Integrations

#### 1. Adzuna API (Real Jobs)
Free API for job listings across multiple countries.

**Setup:**
1. Sign up at https://developer.adzuna.com/
2. Get your App ID and App Key
3. Add to `.env`:
```env
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

**Features:**
- Real-time job search
- 10+ job boards aggregated
- Salary data included
- Location-based search
- Skills matching

#### 2. Mock/Cached Source (Fallback)
Automatically used when live sources fail or are unconfigured.

### Adding New Job Sources

Example: Adding LinkedIn integration

```typescript
class LinkedInJobSource implements JobSource {
  name = "LinkedIn";
  
  async search(options: JobSearchOptions): Promise<Job[]> {
    // Implement LinkedIn API calls
    const response = await fetch(`https://api.linkedin.com/v2/jobs?...`);
    // Transform to internal Job format
    return transformedJobs;
  }
}

// Register in job_search.ts
const sources: JobSource[] = [
  new AdzunaJobSource(),
  new LinkedInJobSource(), // Add here
];
```

### Search Options

```typescript
interface JobSearchOptions {
  title?: string;           // "Software Engineer"
  skills?: string[];        // ["react", "typescript"]
  location?: string;        // "Remote" or "San Francisco"
  jobType?: "remote" | "hybrid" | "onsite" | "any";
  experienceLevel?: string; // "junior", "mid", "senior"
}
```

## CV Analysis Failure Handling

### Failure Categories

All failures include:
- **Code**: Machine-readable error code
- **Message**: User-friendly explanation
- **Actionable Step**: What to do next
- **Suggested Fixes**: List of specific solutions
- **Allow Manual Entry**: Whether user can bypass by entering skills manually

### Example Failure Payloads

#### 1. Image-Only PDF

```json
{
  "parsedProfile": {
    "skills": [],
    "yearsExperience": 0,
    "jobTitles": [],
    "techStack": [],
    "confidenceScore": 0,
    "failure": {
      "code": "IMAGE_ONLY",
      "message": "We couldn't extract readable text from your CV.",
      "actionableStep": "This usually happens with scanned PDFs or image-based documents. Try converting your CV to a text-based PDF.",
      "allowManualEntry": true,
      "suggestedFixes": [
        "Export your CV from Word/Google Docs as PDF",
        "Use an online PDF converter",
        "Ensure 'Save as text-based PDF' is enabled"
      ]
    }
  },
  "matches": []
}
```

#### 2. Missing Skills Section

```json
{
  "parsedProfile": {
    "skills": [],
    "yearsExperience": 5,
    "jobTitles": ["software engineer"],
    "techStack": [],
    "confidenceScore": 0.2,
    "failure": {
      "code": "MISSING_SECTIONS",
      "message": "We couldn't identify any technical skills in your CV.",
      "actionableStep": "Make sure your CV includes a clearly labeled 'Skills' or 'Technical Skills' section with specific technologies.",
      "allowManualEntry": true,
      "suggestedFixes": [
        "Add a dedicated 'Skills' section",
        "List specific technologies and tools",
        "Include both programming languages and frameworks"
      ]
    }
  },
  "matches": []
}
```

#### 3. Low Confidence

```json
{
  "parsedProfile": {
    "skills": ["javascript"],
    "yearsExperience": 0,
    "jobTitles": [],
    "techStack": ["javascript"],
    "confidenceScore": 0.25,
    "failure": {
      "code": "LOW_CONFIDENCE",
      "message": "We had trouble analyzing your CV with confidence.",
      "actionableStep": "Your CV might be missing key sections or using an unusual format. A typical CV should include experience, skills, and education.",
      "allowManualEntry": true,
      "suggestedFixes": [
        "Ensure your CV has clear sections: Experience, Skills, Education",
        "Use standard section headings",
        "Include 2-3 years of experience details",
        "List 5-10 technical skills"
      ]
    }
  },
  "matches": []
}
```

#### 4. Non-Standard Layout

```json
{
  "parsedProfile": {
    "skills": [],
    "yearsExperience": 0,
    "jobTitles": [],
    "techStack": [],
    "confidenceScore": 0,
    "failure": {
      "code": "NON_STANDARD_LAYOUT",
      "message": "Your CV has a complex layout that's difficult to parse.",
      "actionableStep": "Try using a simpler, single-column format without tables or complex graphics.",
      "allowManualEntry": true,
      "suggestedFixes": [
        "Use a standard CV template",
        "Remove tables and multi-column layouts",
        "Stick to simple bullet points and sections"
      ]
    }
  },
  "matches": []
}
```

### Confidence Scoring

Confidence is calculated using weighted factors:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Skills | 40% | `min(foundSkills / 10, 1)` |
| Experience | 20% | `1 if yearsFound > 0 else 0` |
| Job Titles | 20% | `min(foundTitles / 2, 1)` |
| Structure | 20% | `foundSections / expectedSections` |

**Threshold:** 0.3 (30%)

Below this threshold, analysis fails with `LOW_CONFIDENCE` code.

## UI Components

### CVFailureState Component

Professional, empathetic failure screen that:
- Shows appropriate icon for failure type
- Displays user-friendly message
- Provides actionable guidance
- Lists specific fixes
- Offers retry or manual entry options
- Matches overall design aesthetic

**Usage:**

```tsx
import { CVFailureState } from "@/components/CVFailureState";

<CVFailureState
  failure={analysisResponse.parsedProfile.failure}
  onRetry={() => navigate("/")}
  onManualEntry={() => showManualEntryForm()}
/>
```

## API Response Format

### Successful Analysis

```json
{
  "parsedProfile": {
    "skills": ["react", "typescript", "node.js"],
    "yearsExperience": 5,
    "jobTitles": ["software engineer", "full stack developer"],
    "techStack": ["react", "typescript", "node.js"],
    "confidenceScore": 0.85,
    "preferredJobType": "remote"
  },
  "matches": [
    {
      "jobId": 1,
      "matchPercentage": 92,
      "matchedSkills": ["react", "typescript"],
      "missingSkills": ["python"],
      "strengthAlignment": [
        "Strong technical stack overlap",
        "Directly relevant job history"
      ],
      "improvements": [
        "Consider learning or highlighting: python, aws"
      ],
      "job": {
        "title": "Senior Frontend Engineer",
        "company": "TechCorp",
        "location": "Remote",
        "isLive": true,
        "sourceName": "Adzuna"
      }
    }
  ]
}
```

### Failed Analysis

See example payloads above. Key points:
- `parsedProfile.failure` is present
- `matches` array is empty
- HTTP status is still 200 (not an error)
- Client handles gracefully with CVFailureState component

## Testing

### Test Cases

1. **Valid CV** - Standard PDF with clear sections
2. **Scanned PDF** - Image-only document
3. **Complex Layout** - Multi-column, tables, graphics
4. **Missing Skills** - Experience but no skills section
5. **Minimal Content** - Very short document
6. **Password Protected** - Locked PDF
7. **Different Languages** - Non-English CV

### Sample Test CVs

Create test files in `attached_assets/test_cvs/`:
- `valid_cv.pdf` - Good example
- `scanned_cv.pdf` - Will trigger IMAGE_ONLY
- `complex_layout.pdf` - Will trigger NON_STANDARD_LAYOUT
- `no_skills.pdf` - Will trigger MISSING_SECTIONS

## Future Enhancements

1. **More Job Sources**
   - LinkedIn API integration
   - Indeed scraper
   - GitHub Jobs
   - Company career pages

2. **AI-Enhanced Parsing**
   - OpenAI GPT-4 for complex layouts
   - OCR for scanned documents
   - Multi-language support

3. **Manual Entry Flow**
   - Form to manually input skills
   - Experience timeline builder
   - Resume builder integration

4. **Advanced Matching**
   - Culture fit analysis
   - Salary expectations
   - Career progression predictions
   - Company reviews integration
