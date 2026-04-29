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

## Manual Setup Required

To fully use this application, you need to perform the following steps:

1.  **API Tokens**:
    *   Create a `.env.local` file by copying `.env.example`.
    *   **Mapbox**: Get an access token from [Mapbox](https://mapbox.com/) and set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.
    *   **Supabase**: Get your project URL and Anon Key from [Supabase](https://supabase.com/) and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

2.  **Database Configuration**:
    *   Follow the instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to create the required tables for the sharing feature.

3.  **Images**:
    *   The app uses Mapbox Static Images for stop thumbnails. These will automatically work once you provide a valid Mapbox token.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
