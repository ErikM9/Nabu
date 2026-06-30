import minecraftIcon from '../assets/host-minecraft.gif';

function Header() {
  return (
    <header className="w-full relative py-6 h-24">
      <h1
        className="
          absolute left-1/2 top-1/2
          -translate-x-1/2 -translate-y-1/2
          text-8xl font-extrabold tracking-normal
          flex items-center leading-none select-none
        "
        aria-label="Nabu"
      >
        <span className="text-slate-500 drop-shadow-[0_3px_0_rgba(0,0,0,0.65)]">Na</span>
        <span className="text-sky-200 drop-shadow-[0_3px_0_rgba(0,0,0,0.65)]">bu</span>
      </h1>

      <img
        src={minecraftIcon}
        alt="Minecraft host welcoming you"
        className="
          absolute left-1/2 top-1/2
          translate-x-[4.5rem] -translate-y-[3.5rem]
          w-32 h-32
          object-contain
          drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)]
          hover:scale-105 transition-transform duration-200
        "
      />
    </header>
  );
}

export default Header;