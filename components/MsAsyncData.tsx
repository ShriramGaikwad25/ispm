import Image from 'next/image';
type User = {
  id: number;
  firstName: string;
  lastName: string;
  image: string; // Assuming image is a URL (string), not HTMLImageElement
};
export const loadUsers = async (inputValue: string) => {
    const response = await fetch(`https://dummyjson.com/users/search?q=${inputValue}`);
    const data = await response.json();
    return data.users.map((user:User) => ({ value: user.id, label: `${user.firstName} ${user.lastName}`, image: user.image }));
  };

type App = {
  label: string;
  value: string;
  image: string; // Assuming image is a string URL
};
export const loadApps = async (inputValue: string): Promise<App[]> => {
  try {
    const response = await fetch(
      "http://ax.itunes.apple.com/WebObjects/MZStoreServices.woa/ws/RSS/topfreeapplications/limit=100/genre=6007/json"
    );
    if (!response.ok) throw new Error("Failed to fetch apps");
    const data = await response.json();
    return data.feed.entry
      .filter((app: { "im:name": { label: string } }) =>
        app["im:name"].label.toLowerCase().includes(inputValue.toLowerCase())
      )
      .map((app: { "im:name": { label: string }; id: { label: string }; "im:image": { label: string }[] }) => ({
        label: app["im:name"].label, // App Name
        value: app.id.label, // App ID
        image: app["im:image"][2].label, // Medium-sized app icon (image URL)
      }));
  } catch (error) {
    console.error("Error fetching apps:", error);
    return [];
  }
};
type OptionData = {
  label: string;
  image: string; 
};

export const customOption = (props: { data: OptionData; innerRef: React.Ref<HTMLDivElement>; innerProps: React.HTMLAttributes<HTMLDivElement> }) => {
  const { data, innerRef, innerProps } = props;
  return (
    <div ref={innerRef} {...innerProps} className="flex items-center p-2 hover:bg-[#DEEBFF]">
        <Image
          src={data.image as string}
          alt={data.label}
          width={32}
          height={32}
          className="rounded-full mr-2"
        />
      {data.label}
    </div>
  );
};
