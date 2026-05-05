import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <SignIn
        appearance={{
          elements: {
            rootBox: "shadow-2xl",
            card: "rounded-xl",
          },
        }}
      />
    </div>
  );
}
