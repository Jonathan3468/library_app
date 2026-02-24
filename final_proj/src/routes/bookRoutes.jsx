import { Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoutes';
import BookView from '../pages/BookView';
import BookDetails from '../pages/BookDetails';
import AddBook from '../pages/AddBook';

const bookRoutes = (
  <>
    <Route path="books/new" element={
      <ProtectedRoute allowedRoles={['admin', 'librarian']}>
        <AddBook />
      </ProtectedRoute>
    } />
    <Route path="books/:id" element={<BookView />} />
    <Route path="books/:id/edit" element={
      <ProtectedRoute allowedRoles={['admin', 'librarian']}>
        <BookDetails />
      </ProtectedRoute>
    } />
  </>
);

export default bookRoutes;