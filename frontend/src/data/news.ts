import { NewsArticle } from '../types';

export const newsData: NewsArticle[] = [
  {
    id: '1',
    title: 'Harmony College Photography Exhibition Opens in Burayu',
    summary: 'Students from the Visual Arts department showcased their semester work in a public exhibition held at the Burayu City Administration Hall, drawing over 300 visitors.',
    content: `
      <h2>Capturing Burayu: A Student Photography Exhibition</h2>
      <p>Harmony College's Visual Arts & Photography department hosted its first major public exhibition at the Burayu City Administration Hall. Over 80 framed prints captured life, culture, and landscape across the Sheger and Burayu communities, drawing an audience of more than 300 visitors including city officials, families, and fellow students.</p>

      <blockquote>"This exhibition proves that our students aren't just learning technique — they are developing an artistic voice that reflects the world around them." — Ato Biruk Tadesse, Department Head</blockquote>

      <p>The exhibition featured portrait series, documentary street photography, and landscape studies taken throughout the program's first term. Several students received commissions directly from visitors, marking a significant milestone in their professional journeys.</p>

      <h3>Highlights from the Exhibition:</h3>
      <ul>
        <li>Over 80 original prints displayed across two halls.</li>
        <li>Three students received professional photography commissions on the spot.</li>
        <li>Community portraits series featured 40+ residents of Sheger and Burayu.</li>
        <li>Exhibition will travel to a second venue at Harmony College campus next month.</li>
      </ul>

      <p>The next public showcase is scheduled for the end of the semester. Harmony College invites the community to attend and celebrate student achievement in the visual arts.</p>
    `,
    category: 'Events',
    date: 'Jul 10, 2026',
    image: '/exhibition.png',
    author: 'Harmony College Communications Team',
  },
  {
    id: '2',
    title: 'New Music Production Studio Inaugurated at Harmony College',
    summary: 'Harmony College officially opens its professional Cubase recording studio, giving music production and vocal students access to broadcast-quality audio equipment.',
    content: `
      <h2>A New Sound for Sheger: Harmony College's Recording Studio Opens</h2>
      <p>Harmony College officially inaugurated its new professional recording studio on the Sheger campus, marking a major upgrade for students enrolled in the Music Instruments, Vocal, and Cubase Music Production programs. The studio features a fully treated vocal booth, studio monitors, MIDI controllers, and Steinberg Cubase workstations for up to 12 students simultaneously.</p>

      <p>The studio was designed in partnership with local audio engineers and is equipped to handle full music production from composition and recording through mixing and mastering for streaming platforms.</p>

      <blockquote>"Our students now have the same tools used in professional studios across Ethiopia and beyond. There is no ceiling on what they can create here." — Ato Dawit Bekele, Music Production Lead</blockquote>

      <p>The inaugural session featured live performances and original productions by current students, including a four-track EP recorded entirely by first-year Cubase students. The EP will be released on local streaming platforms next month.</p>

      <h3>Studio Features:</h3>
      <ul>
        <li>Steinberg Cubase Pro licensed on 12 high-performance workstations.</li>
        <li>Professional vocal booth with Neumann and Rode microphone options.</li>
        <li>MIDI keyboard controllers and Ableton Push pads for beat creation.</li>
        <li>Yamaha HS8 studio monitors for accurate mixing reference.</li>
      </ul>
    `,
    category: 'Campus',
    date: 'Jun 22, 2026',
    image: '/music.png',
    author: 'Campus News Bureau',
  },
  {
    id: '3',
    title: 'Harmony Graduates Land Roles in Addis Media and Design Agencies',
    summary: 'A record number of Harmony College graduates from the Graphic Design, Digital Marketing, and Journalism programs secured professional placements within three months of graduation.',
    content: `
      <h2>From Sheger to the Spotlight: Graduate Placement Success</h2>
      <p>Harmony College is proud to report that over 85% of graduates from the 2025 cohort secured professional employment or freelance clients within three months of completing their programs. The Graphic Design, Digital Marketing, and Journalism departments saw the highest placement rates, with graduates joining media houses, advertising agencies, and digital startups across Addis Ababa and the surrounding Sheger region.</p>

      <blockquote>"I started with zero design skills. After one year at Harmony, I had a full portfolio and landed a junior designer role at an agency in Addis. The training here is practical and real." — Graduate, Graphic Design Program</blockquote>

      <p>The Journalism program also celebrated the placement of two graduates at regional radio stations, while Digital Marketing graduates reported securing clients and running paid social media campaigns independently within weeks of graduation.</p>

      <h3>Graduate Placement Highlights (2025 Cohort):</h3>
      <ul>
        <li>85%+ employment or freelance placement within 3 months.</li>
        <li>Graphic Design graduates placed at agencies in Addis Ababa and Burayu.</li>
        <li>Two Journalism graduates hired by regional radio stations.</li>
        <li>Multiple Digital Marketing alumni running independent client campaigns.</li>
      </ul>

      <p>Harmony College will host its annual Graduation and Portfolio Showcase in August 2026, open to employers and the broader community.</p>
    `,
    category: 'Research',
    date: 'Jun 05, 2026',
    image: '/research.png',
    author: 'Alumni Affairs Office',
  },
];
