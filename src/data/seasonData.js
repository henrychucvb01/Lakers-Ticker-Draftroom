export const startingMembers = [
  {
    id: 1,
    name: "Jason",
    status: "active",
  },
  {
    id: 2,
    name: "Huy",
    status: "active",
  },
  {
    id: 3,
    name: "Courtney",
    status: "active",
  },
  {
    id: 4,
    name: "Uduak",
    status: "active",
  },
  {
    id: 5,
    name: "Theo",
    status: "pending",
  },
];

export const startingGames = [
  {
    id: 1,
    opponent: "Sacramento Kings",
    date: "2026-10-08",
    time: "7:30 PM",
    status: "draft",
    note: "Preseason",
  },
  {
    id: 2,
    opponent: "LA Clippers",
    date: "2026-10-23",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 3,
    opponent: "Portland Trail Blazers",
    date: "2026-10-27",
    time: "8:00 PM",
    status: "draft",
  },
  {
    id: 4,
    opponent: "Charlotte Hornets",
    date: "2026-11-17",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 5,
    opponent: "Sacramento Kings",
    date: "2026-11-20",
    time: "7:00 PM",
    status: "draft",
    note: "NBA Cup",
  },
  {
    id: 6,
    opponent: "Utah Jazz",
    date: "2026-11-23",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 7,
    opponent: "New Orleans Pelicans",
    date: "2026-12-14",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 8,
    opponent: "Philadelphia 76ers",
    date: "2026-12-25",
    time: "2:00 PM",
    status: "draft",
    note: "Christmas Day",
  },
  {
    id: 9,
    opponent: "Memphis Grizzlies",
    date: "2026-12-27",
    time: "6:00 PM",
    status: "draft",
  },
  {
    id: 10,
    opponent: "Boston Celtics",
    date: "2027-01-07",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 11,
    opponent: "Orlando Magic",
    date: "2027-01-14",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 12,
    opponent: "Milwaukee Bucks",
    date: "2027-01-17",
    time: "6:00 PM",
    status: "draft",
  },
  {
    id: 13,
    opponent: "Denver Nuggets",
    date: "2027-02-12",
    time: "7:30 PM",
    status: "draft",
  },
  {
    id: 14,
    opponent: "Chicago Bulls",
    date: "2027-02-16",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 15,
    opponent: "Houston Rockets",
    date: "2027-02-18",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 16,
    opponent: "OKC Thunder",
    date: "2027-03-06",
    time: "5:30 PM",
    status: "draft",
  },
  {
    id: 17,
    opponent: "Cleveland Cavaliers",
    date: "2027-03-12",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 18,
    opponent: "Golden State Warriors",
    date: "2027-03-14",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 19,
    opponent: "Dallas Mavericks",
    date: "2027-03-21",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 20,
    opponent: "Minnesota Timberwolves",
    date: "2027-04-07",
    time: "7:00 PM",
    status: "draft",
  },
  {
    id: 21,
    opponent: "Phoenix Suns",
    date: "2027-04-11",
    time: "5:30 PM",
    status: "draft",
  },
];

export function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const [year, month, day] = dateString.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
