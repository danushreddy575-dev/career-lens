const fetchJobs = async () => {
  return [
    {
      title: "Backend Engineer (Node.js)",
      body: `
        Looking for a Backend Engineer with experience in Node.js,
        Express, MongoDB, Docker, AWS, and REST APIs.
      `
    },
    {
      title: "Frontend Developer",
      body: `
        We need a Frontend Developer skilled in React, JavaScript,
        HTML, CSS, and TypeScript.
      `
    },
    {
      title: "Full Stack Developer",
      body: `
        Required skills: Node.js, React, PostgreSQL, Docker,
        GraphQL, and AWS.
      `
    },
    {
      title: "DevOps Engineer",
      body: `
        Looking for experience with Docker, Kubernetes, AWS,
        Linux, and Git.
      `
    },
    {
      title: "Java Spring Boot Developer",
      body: `
        Need Java, Spring Boot, MySQL, Docker, and Git skills.
      `
    }
  ];
};

module.exports = fetchJobs;