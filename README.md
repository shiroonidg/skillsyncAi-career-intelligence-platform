# Career Intelligence Platform

SUPABASE_URL: [https://supabase.com/dashboard/project/vpbdrmyuglmquaohizdm](https://stardust-storyteller-hub.lovable.app/)
#SkillSync AI
#Intelligent Talent & Workforce Ecosystem
#Bridging the gap between what you know and what the market needs.

SkillSync AI is an AI-powered talent intelligence platform designed to
connect learners and institutions with changing market demand. It
analyzes skills, identifies gaps for target roles, and converts those
gaps into prioritized, actionable learning roadmaps.
Developed for Build for Bharat 2.0 --- Intelligent Talent & Workforce
Ecosystem Track by Team BuildOps.

#TEAM BUILD OPS

Dhairya Gupta (Frontend & Dashboard Engineer)
Moulik Choudhary (AI & Backend Lead)
Mandeep Singh (Data & ML Lead)

#Problem
Students often know what they have studied but do not know which skills
actually matter for their target roles.
At the same time:
- Industry requirements change rapidly.
- Institutions struggle to keep curricula aligned with market demand.
- Job seekers lack a clear way to measure readiness for a role.
- Employers need talent with specific, relevant capabilities.
- There is no single workflow connecting market demand → user
  capability → skill gaps → learning actions.

#Our Solution
SkillSync AI combines market intelligence, NLP, skill-gap analysis, AI
recommendations, and personalized learning into one platform.
Core capabilities
1. Live Market Ingestion --- ingest job-market and hiring data from
   public datasets and open APIs.
2. NLP Skill Extraction --- extract and normalize skills from
   resumes and job descriptions.
3. Exact Skill-Gap Quantification --- compare current skills with
   target-role requirements and generate a match percentage.
4. Personalized Roadmap --- convert skill gaps into a prioritized
   learning sequence.
5. Salary & Trend Forecasting --- provide salary and skill-demand
   trends.
6. Skill Relationship Mapping --- identify useful relationships and
   learning order between skills.


#Platform Modules
1. Job Market Intelligence Dashboard
Provides:
- Top skills
- Emerging skills
- Skills by role
- Skills by industry
- Skills by location
- Salary vs. skill information
2. Career Explorer
For a selected target role:
- Required skills
- Market demand
- Experience requirements
- Education
- Salary range
- Related roles
3. Personal Skill Gap Analyzer
Input a resume and target role to receive:
- Overall match percentage
- Strong skills
- Missing skills
- Prioritized skill gaps
4. Personalized Roadmap Generator
Transforms identified skill gaps into an AI-sequenced learning path
tailored to the target role.


#How It Works
User Skills / Resume
        ↓
Target Role
        ↓
Market Analysis
        ↓
NLP Skill Extraction
        ↓
Skill Gap Engine
        ↓
AI Recommendation
        ↓
Personalized Roadmap
        ↓
Career / Market Insights


#System Architecture
Public Job Datasets + Open APIs
              ↓
       Data Ingestion
              ↓
      Data Preprocessing
              ↓
 Knowledge Extraction
    & Knowledge Base
              ↓
 Models + User Profile
              ↓
   AI Recommendation
              ↓
 Personalized Roadmap
              ↓
       Web Application

       AI / Intelligence Layer
The proposed intelligence layer includes:
- NLP-based skill extraction
- Role matching
- Skill-demand forecasting
- Salary prediction
- Skill-gap analysis
- Recommendation systems
- Skill relationship mapping


#Methodology
Problem → Data → Prepare → Analyze → Insights
The project presentation identifies spaCy / transformer-based NER
for NLP skill extraction and machine-learning models for demand
forecasting, role matching, and salary prediction.



#Demo Example
Target Role
Data Scientist
Overall Match
61%
Strong Skills
Python
SQL
Git
Skill Gaps
Statistics
Pandas
Machine Learning
Cloud (AWS)


#AI-Prioritized Learning Order
1. Statistics
2. Pandas
3. Machine Learning
4. AWS


#Example Roadmap
Python + SQL
      ↓
Statistics
      ↓
Pandas + NumPy
      ↓
Machine Learning
      ↓
Scikit-learn + Projects



#Suggested Repository Structure
SkillSync-AI/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── server.js
├── ai/
│   ├── skill_extraction/
│   ├── skill_matching/
│   ├── recommendation/
│   └── forecasting/
├── data/
│   ├── raw/
│   └── processed/
├── docs/
│   └── project-report.pdf
├── README.md
└── .gitignore


#Clone
git clone <YOUR_REPOSITORY_URL>
cd SkillSync-AI
Install
Install frontend and backend dependencies according to the package
configuration in the repository.
Environment Variables
Create the required .env files for API keys, database configuration,
and deployment settings.
API_KEY=your_api_key
DATABASE_URL=your_database_url
Run
Start the frontend and backend using the commands defined by the
project's package configuration.

 
 #Architecture at a Glance
  Layer                   Responsibility
  Data Sources            Job-market and labour-market information
  Data Ingestion          Reliable data collection
  Preprocessing           Cleaning and normalization
  Knowledge Base          Structured skills, roles and related information
  Models & User Profile   Demand, role, trend and user analysis
  AI Recommendation       Personalized recommendations
  Roadmap                 Sequenced learning path
  Web Application         User-facing platform


  
