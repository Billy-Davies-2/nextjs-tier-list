import TierList from '@/components/tierlist'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen w-full flex justify-center items-start p-4 md:p-6 lg:p-8">
      <TierList />
    </main>
  )
}
