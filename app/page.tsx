"use client";
import React from 'react';
import Link from 'next/link';
import './dashboard.css';

export default function Home() {
  const cards = [
    {
      title: 'My Profile',
      subtitle: '(Empty)'
    },
    {
      title: 'Apps',
      subtitle: ''
    },
    {
      title: 'Access Review',
      subtitle: '(User Manager,App Owner)'
    },
    {
      title: 'Entitlement Mgmt',
      subtitle: '(Catalog)'
    },
    {
      title: 'Admin Center',
      subtitle: '(Users)'
    },
    {
      title: 'Audit Corner',
      subtitle: '(Reports & Auditor Evidence)'
    }
  ];

  const routeByTitle: Record<string, string> = {
    'My Profile': '/profiles',
    'Apps': '/applications',
    'Access Review': '/access-review',
    'Entitlement Mgmt': '/catalog',
    'Admin Center': '/user',
    'Audit Corner': '/campaigns',
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link key={card.title} href={routeByTitle[card.title] || '#'} className="block">
            <div className="card w-full h-40 rounded-xl bg-transparent border border-[#BFE1D9] transition-shadow hover:shadow-lg">
              <div className="card-inner rounded-xl">
                <div className="card-front flex flex-col items-center justify-center rounded-xl p-4 bg-[#EAF5F2]">
                  <div className="text-lg font-semibold text-[#27685b]">{card.title}</div>
                  {card.subtitle ? (
                    <div className="text-xs text-[#3b776c] mt-1 text-center px-2">{card.subtitle}</div>
                  ) : null}
                </div>
                <div className="card-back flex items-center justify-center rounded-xl p-4 bg-[#27685b] text-white">
                  <div className="text-center">
                    <div className="text-base font-semibold">{card.title}</div>
                    {card.subtitle ? (
                      <div className="text-xs opacity-90 mt-1 px-2">{card.subtitle}</div>
                    ) : (
                      <div className="text-xs opacity-90 mt-1">Explore</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}