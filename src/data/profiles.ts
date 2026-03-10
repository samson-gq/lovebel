import profile1 from "@/assets/profile1.jpg";
import profile2 from "@/assets/profile2.jpg";
import profile3 from "@/assets/profile3.jpg";
import profile4 from "@/assets/profile4.jpg";
import profile5 from "@/assets/profile5.jpg";
import profile6 from "@/assets/profile6.jpg";

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  distance: string;
  image: string;
  interests: string[];
}

export const profiles: Profile[] = [
  {
    id: "1",
    name: "Алина",
    age: 24,
    bio: "Люблю путешествия и хороший кофе ☕",
    distance: "3 км",
    image: profile1,
    interests: ["Путешествия", "Фотография", "Кофе"],
  },
  {
    id: "2",
    name: "Дмитрий",
    age: 27,
    bio: "Разработчик днём, музыкант ночью 🎸",
    distance: "5 км",
    image: profile2,
    interests: ["Музыка", "Код", "Спорт"],
  },
  {
    id: "3",
    name: "Виктория",
    age: 23,
    bio: "Дизайнер интерьеров. Ищу вдохновение ✨",
    distance: "2 км",
    image: profile3,
    interests: ["Дизайн", "Искусство", "Йога"],
  },
  {
    id: "4",
    name: "Максим",
    age: 29,
    bio: "Сёрфер и путешественник 🌊",
    distance: "8 км",
    image: profile4,
    interests: ["Сёрфинг", "Путешествия", "Фитнес"],
  },
  {
    id: "5",
    name: "Екатерина",
    age: 25,
    bio: "Книжный червь и вечный студент 📚",
    distance: "1 км",
    image: profile5,
    interests: ["Книги", "Наука", "Кино"],
  },
  {
    id: "6",
    name: "Артём",
    age: 26,
    bio: "Фитнес-тренер. Помогу достичь целей 💪",
    distance: "4 км",
    image: profile6,
    interests: ["Фитнес", "Питание", "Мотивация"],
  },
];
