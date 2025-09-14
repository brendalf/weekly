import { HeroUIProvider } from '@heroui/react';

import { WeeklyDashboard } from '@/components/WeeklyDashboard';

function App() {
  return (
    <HeroUIProvider>
      <div className="min-h-screen bg-background">
        <WeeklyDashboard />
      </div>
    </HeroUIProvider>
  );
}

export default App;
