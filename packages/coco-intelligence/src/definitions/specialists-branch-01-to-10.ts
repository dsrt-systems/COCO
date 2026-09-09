import type { AgentDefinitionContract } from '@coco/protocol';
import { buildSpecialistContract, buildCriticContract, type BranchSpecialistSpec } from './master-roster-generator';

// We map out the full 134 capabilities per Deep Spec 1 §4.
// For brevity in code generation, we loop over the taxonomy data structure.

const RAW_TAXONOMY = [
  // BRANCH 1: SOFTWARE & SYSTEMS ENGINEERING (B1_engineering_director)
  { id: 'C1', name: 'Python Systems Architect', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C2', name: 'Frontend & UI Architect (React/TS)', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C3', name: 'Backend Systems Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C4', name: 'PostgreSQL & DB Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C5', name: 'DevOps & Kubernetes Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C6', name: 'Cloud Infrastructure (AWS/GCP)', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C7', name: 'Distributed Systems Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C8', name: 'Distributed Cache Engineer (Redis)', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C9', name: 'Microservices & Event Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C10', name: 'WebSec & Cryptography Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C11', name: 'API & Middleware Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C12', name: 'Performance & Profiling Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C13', name: 'Mobile Engineer (React Native/iOS)', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C14', name: 'Data Pipeline & ETL Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C15', name: 'Machine Learning Infrastructure', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C16', name: 'Vector DB & Retrieval Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C17', name: 'Legacy Code Migration Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C18', name: 'Embedded Firmware Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C19', name: 'QA & Automation Specialist', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },
  { id: 'C20', name: 'Technical Documentation Engineer', domain: 'Software & Systems Engineering', dId: 'B1_engineering_director' },

  // BRANCH 2: RESEARCH & INFORMATION INTELLIGENCE (B2_research_director)
  { id: 'C21', name: 'Deep Web Investigator', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C22', name: 'Academic & Paper Synthesizer', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C23', name: 'Patent & IP Search Specialist', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C24', name: 'Data Scraper & Parser', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C25', name: 'Citation & Provenance Verifier', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C26', name: 'Quantitative Data Specialist', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C27', name: 'Qualitative Synthesis Specialist', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C28', name: 'Market & Industry Investigator', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C29', name: 'Cross-Language Translator', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C30', name: 'Contradiction Detection Specialist', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C31', name: 'Primary Source Evaluator', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C32', name: 'Real-time News & Signal Specialist', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C33', name: 'Benchmark & Dataset Analyst', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C34', name: 'Regulatory Archive Researcher', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },
  { id: 'C35', name: 'Executive & Biographical Analyst', domain: 'Research & Information Intelligence', dId: 'B2_research_director' },

  // BRANCH 3: LEGAL, POLICY & GOVERNANCE (B3_legal_director)
  { id: 'C36', name: 'Corporate & Commercial Attorney', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C37', name: 'IP & Patent Law Attorney', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C38', name: 'Regulatory Compliance Officer', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C39', name: 'Contract & SLA Redliner', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C40', name: 'GDPR & Data Privacy Attorney', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C41', name: 'M&A / Due Diligence Attorney', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C42', name: 'Labor & Employment Legal Specialist', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C43', name: 'Tax Law & Structuring Attorney', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C44', name: 'International Trade & Customs Specialist', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C45', name: 'Antitrust & Competition Analyst', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C46', name: 'Environmental & ESG Compliance', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },
  { id: 'C47', name: 'Litigation Risk Analyst', domain: 'Legal, Policy & Governance', dId: 'B3_legal_director' },

  // BRANCH 4: FINANCIAL, ECONOMIC & VALUATION (B4_finance_director)
  { id: 'C48', name: 'Corporate Financial Modeler', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C49', name: 'DCF & LBO Valuation Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C50', name: 'Unit Economics & SaaS Analyst', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C51', name: 'Risk & Volatility Modeler', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C52', name: 'Macroeconomic & FX Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C53', name: 'Cryptoeconomics & Token Analyst', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C54', name: 'Venture Capital & Equity Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C55', name: 'Tax Optimization Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C56', name: 'Real Estate & Asset Valuation', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C57', name: 'Forensic Accounting Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C58', name: 'Capital Allocation Strategist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },
  { id: 'C59', name: 'Actuarial & Insurance Specialist', domain: 'Financial, Economic & Valuation', dId: 'B4_finance_director' },

  // BRANCH 5: MEDICINE, LIFE SCIENCES & HEALTHCARE (B5_medical_director)
  { id: 'C60', name: 'Clinical Research Investigator', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C61', name: 'Diagnostic Decision Support Spec', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C62', name: 'Pharmacology & Interaction Spec', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C63', name: 'Immunology & Pathology Specialist', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C64', name: 'Oncology Literature Specialist', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C65', name: 'Neuroscience Research Specialist', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C66', name: 'Genomic & Bio-Data Specialist', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C67', name: 'Healthcare Regulatory Compliance', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C68', name: 'Medical Device (FDA/CE) Spec', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C69', name: 'Public Health & Epidemiology Spec', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C70', name: 'Healthcare Economics Specialist', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },
  { id: 'C71', name: 'Clinical Trial Protocol Designer', domain: 'Medicine, Life Sciences & Healthcare', dId: 'B5_medical_director' },

  // BRANCH 6: BUSINESS, PRODUCT & GROWTH (B6_product_director)
  { id: 'C72', name: 'Product Requirements Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C73', name: 'Go-To-Market (GTM) Strategist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C74', name: 'Competitive Moat Analyst', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C75', name: 'User Acquisition & Growth Eng', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C76', name: 'Funnel Optimization Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C77', name: 'Strategic Partnership Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C78', name: 'Customer Discovery & Persona Spec', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C79', name: 'Pricing & Packaging Strategist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C80', name: 'Enterprise Sales Process Designer', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C81', name: 'Product-Led Growth (PLG) Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C82', name: 'Customer Success & Churn Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },
  { id: 'C83', name: 'M&A Synergy & Integration Specialist', domain: 'Business, Product & Growth', dId: 'B6_product_director' },

  // BRANCH 7: HARDWARE, ROBOTICS & PHYSICAL SYSTEMS (B10_hardware_director)
  { id: 'C84', name: 'Mechanical & CAD Designer', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C85', name: 'PCB Layout & Electronics Engineer', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C86', name: 'Firmware & Microcontroller Spec', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C87', name: 'Control Systems & Kinematics Spec', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C88', name: 'Robotics Sensor Fusion Specialist', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C89', name: 'IoT Infrastructure Specialist', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C90', name: 'Autonomous Navigation Specialist', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C91', name: 'Materials Science Specialist', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C92', name: 'Thermal & Power Management Spec', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },
  { id: 'C93', name: 'Manufacturing & DFMA Engineer', domain: 'Hardware, Robotics & Physical Systems', dId: 'B10_hardware_director' },

  // BRANCH 8: CREATIVE, MEDIA & COMMUNICATIONS (B7_creative_director)
  { id: 'C94', name: 'UI/UX Design System Specialist', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C95', name: 'Design System Architect', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C96', name: 'Interactive Prototype Designer', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C97', name: 'Information Architecture Spec', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C98', name: 'Accessibility (WCAG) Specialist', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C99', name: 'Brand Identity & Voice Designer', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C100', name: 'Technical Copywriter & Editor', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C101', name: 'Video Script & Storyboard Spec', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C102', name: 'Community & Developer Rel Spec', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },
  { id: 'C103', name: 'Crisis Communication Strategist', domain: 'Creative, Media & Communications', dId: 'B7_creative_director' },

  // BRANCH 9: APPLIED SCIENCES & MATHEMATICS (B9_operations_director)
  { id: 'C104', name: 'Statistical Modeling Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C105', name: 'Quantum Computing Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C106', name: 'Physics Simulation Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C107', name: 'Computational Chemistry Spec', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C108', name: 'Dynamical Systems Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C109', name: 'Spatial & GIS Analytics Spec', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C110', name: 'Fluid Dynamics (CFD) Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C111', name: 'Climate & Atmospheric Scientist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C112', name: 'Operations Research Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C113', name: 'Bio-Informatics Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C114', name: 'Applied Cryptography Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C115', name: 'Game Theory & Auction Designer', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C116', name: 'Signal Processing Engineer', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C117', name: 'Graph Theory & Topology Spec', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },
  { id: 'C118', name: 'Causal Inference Specialist', domain: 'Applied Sciences & Mathematics', dId: 'B9_operations_director' },

  // BRANCH 10: OPERATIONAL & DOMAIN-SPECIFIC (B9_operations_director / B1_engineering_director)
  { id: 'C119', name: 'Warehousing & Logistics Spec', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C120', name: 'Procurement & Vendor Specialist', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C121', name: 'Real Estate Facility Manager', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C122', name: 'Construction Project Engineer', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C123', name: 'Energy Grid & Utility Specialist', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C124', name: 'Agriculture & AgTech Specialist', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C125', name: 'E-Commerce Operations Specialist', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C126', name: 'Media & Entertainment Operations', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C127', name: 'Educational Curriculum Designer', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C128', name: 'Hospitality & Experience Spec', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C129', name: 'Aerospace & Avionics Engineer', domain: 'Operational & Domain-Specific', dId: 'B1_engineering_director' },
  { id: 'C130', name: 'Automotive Systems Specialist', domain: 'Operational & Domain-Specific', dId: 'B1_engineering_director' },
  { id: 'C131', name: 'Maritime & Marine Engineer', domain: 'Operational & Domain-Specific', dId: 'B1_engineering_director' },
  { id: 'C132', name: 'Defense & Dual-Use Tech Spec', domain: 'Operational & Domain-Specific', dId: 'B1_engineering_director' },
  { id: 'C133', name: 'Urban Planning & Smart City Spec', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' },
  { id: 'C134', name: 'Mining & Extraction Specialist', domain: 'Operational & Domain-Specific', dId: 'B9_operations_director' }
];

export const MASTER_ROSTER: AgentDefinitionContract[] = RAW_TAXONOMY.flatMap((spec) => {
  const code = spec.id;
  const slug = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const agentId = `${code}_${slug}`;
  const criticId = `${code}_critic_${slug}`;

  // Use branch number to group methodologies (1-10)
  const branchNum = parseInt(code.substring(1), 10) <= 20 ? 1 :
                    parseInt(code.substring(1), 10) <= 35 ? 2 :
                    parseInt(code.substring(1), 10) <= 47 ? 3 :
                    parseInt(code.substring(1), 10) <= 59 ? 4 :
                    parseInt(code.substring(1), 10) <= 71 ? 5 :
                    parseInt(code.substring(1), 10) <= 83 ? 6 :
                    parseInt(code.substring(1), 10) <= 93 ? 7 :
                    parseInt(code.substring(1), 10) <= 103 ? 8 :
                    parseInt(code.substring(1), 10) <= 118 ? 9 : 10;

  let framework = 'COCO Standard Methodology';
  let steps = ['Analyze', 'Plan', 'Execute', 'Review'];

  if (branchNum === 1) {
    framework = 'TDD & Clean Architecture';
    steps = ['Define domain schemas', 'Write tests', 'Implement async logic', 'Run static analysis', 'Submit to critic'];
  } else if (branchNum === 2) {
    framework = 'Triangulated Evidence Extraction';
    steps = ['Deconstruct topic', 'Parallel search', 'Extract quotes', 'Hash provenance', 'Triangulate'];
  } else if (branchNum === 3) {
    framework = 'IRAC (Issue, Rule, Application, Conclusion)';
    steps = ['Identify issues', 'Retrieve statutes & precedent', 'Apply rules', 'Draft terms', 'Submit to critic'];
  } else if (branchNum === 4) {
    framework = 'Audited Dynamic Modeling';
    steps = ['Extract historicals', 'Build drivers', 'Construct statements', 'Run sensitivity', 'Audit output'];
  } else if (branchNum === 5) {
    framework = 'Evidence-Based Medicine (PRISMA/GRADE)';
    steps = ['Formulate PICO', 'Search databases', 'Extract effect sizes', 'Apply Cochrane RoB2', 'Grade evidence'];
  }

  const baseSpec: BranchSpecialistSpec = {
    code,
    id: agentId,
    name: spec.name,
    branchNumber: branchNum,
    branchName: spec.domain,
    directorId: spec.dId,
    thesis: `World-class performance in ${spec.name} through specialized domain execution.`,
    framework,
    steps,
    criticId,
  };

  return [
    buildSpecialistContract(baseSpec),
    buildCriticContract(baseSpec)
  ];
});

export const ALL_SPECIALISTS_AND_CRITICS = MASTER_ROSTER;

