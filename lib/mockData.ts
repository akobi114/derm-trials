export interface Trial {
  id: string;
  title: string;
  condition: string;
  location: string;
  compensation: string;
  status: "Recruiting" | "Full";
  tags: string[];
}

export const MOCK_TRIALS: Trial[] = [
  {
    id: "1",
    title: "Topical Cream for Moderate Plaque Psoriasis",
    condition: "Psoriasis",
    location: "Scottsdale, AZ",
    compensation: "$75 per visit",
    status: "Recruiting",
    tags: ["Topical", "No Injections", "Ages 18-65"],
  },
  {
    id: "2",
    title: "Biologic Injection for Severe Atopic Dermatitis",
    condition: "Eczema",
    location: "Phoenix, AZ (Downtown)",
    compensation: "$1,200 total",
    status: "Recruiting",
    tags: ["Biologic", "Severe Cases", "Free Uber"],
  },
  {
    id: "3",
    title: "Laser Therapy for Acne Scarring (Face)",
    condition: "Acne",
    location: "Tempe, AZ",
    compensation: "Free Treatment",
    status: "Full",
    tags: ["Device", "Cosmetic", "Waitlist Only"],
  },
  {
    id: "4",
    title: "Oral JAK Inhibitor for Alopecia Areata",
    condition: "Alopecia",
    location: "Mesa, AZ",
    compensation: "$100 per visit",
    status: "Recruiting",
    tags: ["Oral Pill", "Hair Loss", "FDA Trial"],
  },
];