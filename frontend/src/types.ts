export interface Degree {
  name: string;
  level: 'Undergraduate' | 'Graduate';
  duration: string;
}

export interface ResearchLab {
  name: string;
  focus: string;
}

export interface School {
  id: string;
  name: string;
  icon: string; // lucide icon name
  description: string;
  longDescription: string;
  dean: string;
  tuitionPerCredit: number;
  degrees: Degree[];
  labs: ResearchLab[];
  requirements: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  image: string;
  rating: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'Research' | 'Campus' | 'Events';
  date: string;
  image: string;
  author: string;
}
