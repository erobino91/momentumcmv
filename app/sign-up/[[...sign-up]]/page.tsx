import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar">
      <SignUp
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
