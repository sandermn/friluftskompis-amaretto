This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

The AI packing list endpoint requires an Anthropic API key:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

Without this key, `POST /api/packing-list` will fail.

## AI packing list (F6)

This PR adds an AI-generated packing list shown in the expanded trip panel under `WeatherForecast`.

- UI: `app/components/PackingList.tsx`
  - Lets users set participants and trip days
  - Generates checklist items grouped by category
  - Supports checking/unchecking items locally
- API: `app/api/packing-list/route.ts`
  - Calls Claude Haiku (`claude-haiku-4-5`)
  - Uses trip metadata and weather summary to tailor the packing list
  - Returns structured JSON with `categories` and `tips`

Example request body:

```json
{
  "tripName": "Rondane helgetur",
  "distanceKm": 14,
  "difficulty": "Middels",
  "participants": 3,
  "days": 2,
  "weather": {
    "tempMin": 2,
    "tempMax": 10,
    "precipTotal": 6.4,
    "windMax": 12,
    "hasSnow": true
  }
}
```

## CI/CD

This project includes a GitHub Actions CI workflow that automatically runs on every push and pull request to `main` and `develop` branches. The workflow:

- Installs dependencies with `npm ci`
- Runs linting checks with `npm run lint`
- Builds the project with `npm run build`

The CI configuration is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
