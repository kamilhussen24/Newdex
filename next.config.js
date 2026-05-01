/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // যদি শুধু স্ট্যাটিক + API function চান তাহলে এটা লাগবে না, বরং Cloudflare adapter নিজেই হ্যান্ডেল করে
};

export default nextConfig;