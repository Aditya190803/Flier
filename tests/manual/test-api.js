const testContent =
  "<p>The Best of MASCC conference serves as a focused platform for healthcare professionals, researchers, and experts to exchange ideas, showcase innovations, and elevate standards of care in oncology support. With a strong foundation in evidence-based practice and compassionate care, this event continues to foster meaningful dialogue and collaboration across the community.</p>";

fetch("http://localhost:3000/api/format-email-preview", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ htmlContent: testContent }),
})
  .then((response) => response.json())
  .then((data) => {
    console.log("Success:", data);
    console.log("Original length:", testContent.length);
    if (data.formattedHTML) {
      console.log("Formatted length:", data.formattedHTML.length);
      console.log(
        "Contains full text:",
        data.formattedHTML.includes("across the community"),
      );
    }
  })
  .catch((error) => {
    console.error("Error:", error);
  });
