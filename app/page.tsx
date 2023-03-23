import { Inter } from 'next/font/google'
import styles from './page.module.css'
import { TierList } from '@/components/tierlist'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <main className={styles.main}>
      <TierList></TierList>
    </main>
  )
}
