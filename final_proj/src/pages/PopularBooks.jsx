import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function PopularBooks() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularBooks();
  }, [period]);

  const fetchPopularBooks = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/books/popular/most-borrowed?period=${period}&limit=20`);
      setBooks(res.data.books);
    } catch (err) {
      console.error("Failed to fetch popular books:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Popular Books</h2>
          
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Time</option>
            <option value="year">This Year</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : books.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No data available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book, index) => (
              <div
                key={book.book_id}
                onClick={() => navigate(`/books/${book.book_id}`)}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl cursor-pointer transition relative"
              >
                {/* Rank Badge */}
                <div className="absolute top-2 right-2 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                  #{index + 1}
                </div>

                <h3 className="font-bold text-lg mb-2 pr-12">{book.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {book.Authors?.map(a => a.author_name).join(", ")}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Year: {book.publication_year}
                </p>

                {/* Borrow Count */}
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="font-semibold text-green-600">
                    {book.borrow_count} times borrowed
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}