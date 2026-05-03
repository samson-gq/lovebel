import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEMALE = ["Анна","Мария","Елена","Ольга","Юлия","Наталья","Татьяна","Ирина","Светлана","Екатерина","Дарья","Алина","Виктория","Полина","Ксения","Александра","София","Валерия","Кристина","Маргарита","Вероника","Анастасия","Алиса","Милана","Ева"];
const MALE = ["Александр","Дмитрий","Максим","Сергей","Андрей","Алексей","Артём","Илья","Кирилл","Михаил","Никита","Иван","Егор","Роман","Павел","Глеб","Тимур","Денис","Антон","Владимир","Олег","Игорь","Юрий","Виктор","Григорий"];
const CITIES = ["Москва","Санкт-Петербург","Минск","Гомель","Брест","Витебск","Гродно","Могилёв","Киев","Казань","Новосибирск","Екатеринбург","Сочи","Краснодар","Нижний Новгород"];
const BIOS = [
  "Люблю путешествия, кофе и хорошие книги.",
  "Ищу того, с кем можно говорить часами.",
  "Спорт, горы и закаты — моя слабость.",
  "IT-шник днём, гитарист вечером.",
  "Кошатник со стажем 🐈",
  "Йога, медитация и вкусная еда.",
  "Если ты тоже любишь ramen — пиши!",
  "Фотографирую людей и города.",
  "Серьёзные отношения, без игр.",
  "Просто хочу найти своего человека ❤️",
  "Любитель настолок и крафтового пива.",
  "Бегаю марафоны, читаю фантастику.",
  "Хочу научиться сёрфить вместе.",
  "Веганка, путешественница, мечтательница.",
  "Театр, выставки, долгие прогулки.",
];
const INTERESTS = ["путешествия","кино","музыка","спорт","книги","кофе","йога","готовка","фото","танцы","велосипед","горы","театр","настолки","программирование","искусство","музеи","бег","скалолазание","серфинг","вино","саке","аниме","собаки","кошки"];
const ZODIACS = ["Овен","Телец","Близнецы","Рак","Лев","Дева","Весы","Скорпион","Стрелец","Козерог","Водолей","Рыбы"];
const EDU = ["Высшее","Магистратура","Среднее специальное","Кандидат наук","Бакалавр"];
const OCC = ["Дизайнер","Разработчик","Маркетолог","Врач","Учитель","Менеджер","Фотограф","Юрист","Инженер","Психолог","Бариста","Бизнес-аналитик","Архитектор","Журналист","Музыкант"];
const CHILDREN = ["Нет","Есть","Хочу когда-нибудь","Не хочу"];
const SMOKING = ["Не курю","Курю","Иногда","Бросил(а)"];
const DRINKING = ["Не пью","По праздникам","Социально","Регулярно"];
const PROMPTS = [
  "Идеальный выходной — это…",
  "Лучший комплимент, который мне делали…",
  "Никогда не пропущу…",
  "Вместе мы могли бы…",
  "Самая необычная еда, что я пробовал(а)…",
  "Моя суперсила…",
];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const pickN = <T,>(a: T[], n: number) => {
  const c = [...a].sort(() => Math.random() - 0.5);
  return c.slice(0, n);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const count = Math.min(parseInt(url.searchParams.get("count") ?? "100", 10), 200);

  const created: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    const isFemale = i % 2 === 0;
    const name = isFemale ? pick(FEMALE) : pick(MALE);
    const email = `seed_${Date.now()}_${i}@lovebel.test`;

    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name, seeded: true },
    });
    if (uErr || !u.user) {
      errors.push(`auth ${i}: ${uErr?.message}`);
      continue;
    }

    const userId = u.user.id;
    const age = 18 + Math.floor(Math.random() * 30);
    const heightCm = isFemale ? 155 + Math.floor(Math.random() * 25) : 170 + Math.floor(Math.random() * 25);
    const interests = pickN(INTERESTS, 3 + Math.floor(Math.random() * 4));
    const avatarIdx = (i % 70) + 1;

    const { error: pErr } = await admin
      .from("profiles")
      .upsert({
        user_id: userId,
        name,
        age,
        gender: isFemale ? "female" : "male",
        city: pick(CITIES),
        bio: pick(BIOS),
        avatar_url: `https://i.pravatar.cc/600?img=${avatarIdx}`,
        interests,
        height_cm: heightCm,
        education: pick(EDU),
        occupation: pick(OCC),
        zodiac: pick(ZODIACS),
        children: pick(CHILDREN),
        smoking: pick(SMOKING),
        drinking: pick(DRINKING),
        is_verified: Math.random() < 0.3,
      }, { onConflict: "user_id" });
    if (pErr) {
      errors.push(`profile ${i}: ${pErr.message}`);
      continue;
    }

    // 1-2 prompts
    const promptCount = 1 + Math.floor(Math.random() * 2);
    const chosen = pickN(PROMPTS, promptCount);
    for (let p = 0; p < chosen.length; p++) {
      await admin.from("profile_prompts").insert({
        user_id: userId,
        prompt: chosen[p],
        answer: pick(BIOS),
        position: p,
      });
    }

    created.push(userId);
  }

  return new Response(JSON.stringify({ created: created.length, errors: errors.slice(0, 10), total_errors: errors.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
