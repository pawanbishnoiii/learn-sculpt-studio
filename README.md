# Remix of Study Sphere

https://github.com/pawanbishnoiii/bs20 ye project ki main repo se  complete clone kro and database setup karo  and "bs555_260917.backup" es file me sara data hai old and esme a@a.a email vala user hai uska sara old history and data add karo and usi email se login working banao database me and today page me "Analytics" ye section ka ui acha hai and Questions jesa ya test jesa esme nahi hoga esme by deflat day seclated hoga and esme study start kab hi hai day me first timme and exit last reading / online class kab ki hai and kitna time me kitna output nikala hai and clay-fonts find kro and use karo and  today page ki image send ki hai dekho and esko batter banao and today page me 


Draggable Widget Grid ( ye aik type ka dashobard ke componets hai esko desktop , mobile screen frendly banao and sab working hoge real time me "pasted-2026-09-17T17-15-43-526Z.txt" es componet ko copy karo and use kro and app me bottom nav menu hai   ( HomeTimetableStudyTargetsHistory ) ye phone screen me show hota hai esko upgrade kro eski jgha new componet use kro "Liquid Morph Floating Menu" (  Copy-paste this component to /components/ui folder:

```tsx

liquid-morph-floating-menu.tsx

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

interface MenuItem {

  label: string;

  onClick?: () => void;

}

interface FloatingMenuProps {

  items?: MenuItem[];

}

function MenuButton({

  label,

  onClick,

  isOpen,

  index,

}: {

  label: string;

  onClick?: () => void;

  isOpen: boolean;

  index: number;

}) {

  const [hovered, setHovered] = useState(false);

  const animatingRef = useRef(false);

  const pendingLeaveRef = useRef(false);

  const chars = label.split("");

  const lockDuration = 30 * chars.length + 300;

  const handleEnter = useCallback(() => {

    pendingLeaveRef.current = false;

    if (hovered) return;

    setHovered(true);

    animatingRef.current = true;

    setTimeout(() => {

      animatingRef.current = false;

      if (pendingLeaveRef.current) {

        pendingLeaveRef.current = false;

        setHovered(false);

      }

    }, lockDuration);

  }, [hovered, lockDuration]);

  const handleLeave = useCallback(() => {

    if (animatingRef.current) {

      pendingLeaveRef.current = true;

    } else {

      setHovered(false);

    }

  }, []);

  return (

    

      



        {chars.map((char, i) => (

          

            

              

                {char}

              

              

                {char}

              

            

          

        ))}

      



    

  );

}

export default function FloatingMenu({ items }: FloatingMenuProps) {

  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);

  const menuItems: MenuItem[] = items ?? [

    { label: "Home" },

    { label: "Works" },

    { label: "Contact" },

  ];

  // Close on outside click

  useEffect(() => {

    if (!isOpen) return;

    const handler = (e: MouseEvent) => {

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {

        setIsOpen(false);

      }

    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);

  }, [isOpen]);

  return (

    

       {

          if (!isOpen) setIsOpen(true);

        }}

        style={{

          fontFamily: "'Aeonik TRIAL', 'Inter', sans-serif",

          letterSpacing: "-0.02em",

          cursor: isOpen ? "default" : "pointer",

        }}

        animate={{

          width: isOpen ? 280 : 150,

          height: isOpen ? 260 : 48,

          borderRadius: isOpen ? 32 : 72,

          scale: 1,

        }}

        whileHover={isOpen ? undefined : { scale: 1.05 }}

        transition={{

          duration: 0.8,

          ease,

          height: { duration: isOpen ? 0.8 : 0.15 },

          scale: { duration: 0.25, ease },

        }}

      >

        {/* Yellow background layer */}

        

        {/* Dark circle expanding from bottom */}

        

        {/* Menu items */}

        



          {menuItems.map((item, idx) => (

            

          ))}

        



        {/* Bottom bar: Menu + hamburger */}

         setIsOpen(!isOpen)}

          animate={{

            paddingLeft: isOpen ? 24 : 20,

            paddingRight: isOpen ? 24 : 20,

            paddingBottom: isOpen ? 24 : 0,

            height: 48,

          }}

          transition={{ duration: 0.8, ease }}

          style={{ alignItems: "center" }}

        >

          

            Menu

          

          



            

            

          



        

      

    

  );

}

demo.tsx

"use client";

import FloatingMenu from "../components/ui/liquid-morph-floating-menu";

function SkeletonLoader() {

  return (

    



      {/* Header */}

      



        {/* Logo */}

        



        {/* Nav Items */}

        



          



          



          



        



        {/* CTA */}

        



      



      {/* Hero Section */}

      



        



        



        



        



        



          



          



        



      



      {/* Grid Content - Section 1 */}

      



        



        



          {[1, 2, 3].map((i) => (

            



              



              



              



              



                



                



              



            



          ))}

        



      



      {/* Feature Block - Section 2 */}

      



        



          



          



          



          



          



        



        



      



      {/* Grid Content - Section 3 */}

      



        



        



          {[1, 2].map((i) => (

            



              



              



                



                



                



              



            



          ))}

        



      



      {/* Footer */}

      



        



        



          



          



          



        



      



    



  );

}

export default function FloatingMenuDemo() {

  return (

    



      

      

    



  );

}

```

Install NPM dependencies:

```bash

framer-motion

```

 ) ye bhi copy karo and use kro and riv file ko copy karo esme kafi sare fully responsive animated icons hai ye use kro jaha icons nahi hai ya basic hai vaha and database me suggestion system ko or user exprince or batter karo and quality improve kro and jaha jaha clay illstater png missing hai vaha use kro jese study page me use kiya hai and welcome page me vese hi or jagha par bhi add karo alag alag and fully production ready system banao and clone project and fir database and fir baki sab and "desion-2" "desion-1"  ye dono images dhang se dekho esme multipal app screeen hai es level ki quality meri app me chahiye same es type ke colors but thode or bold ho and clay-fonts find kro and motion or batter karo and smoothness flutter app jesi ho and sab kuch aik sath build kro ( starting me repo clone karo main and fir database fir baki sab )

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://chronodeck.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7770f93-6c3d-42f1-b7e4-b07fa05186b4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
