(async function() {
    try {
        // Fetch employees data
        const response = await fetch("data.json");
        let employees = await response.json();
        
        // Fix any data inconsistencies (like LastName vs lastName)
        employees = employees.map(emp => ({
            ...emp,
            lastName: emp.lastName || emp.LastName || '',
            imageUrl: emp.imageUrl || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
        }));
        
        let selectedId = employees[0]?.id || null;

        // DOM Elements
        const listContainer = document.querySelector(".emp-list-items");
        const detailContainer = document.querySelector(".emp-detail-info");
        const addModal = document.querySelector("#addModal");
        const editModal = document.querySelector("#editModal");
        const addForm = document.querySelector("#addForm");
        const editForm = document.querySelector("#editForm");
        const searchInput = document.querySelector("#searchInput");
        const sortSelect = document.querySelector("#sortSelect");
        const totalEl = document.querySelector("#totalEmployees");
        const avgEl = document.querySelector("#avgSalary");
        const addBtn = document.querySelector("#addEmployeeBtn");
        const cancelAddBtn = document.querySelector("#cancelAddBtn");
        const cancelEditBtn = document.querySelector("#cancelEditBtn");
        const toastContainer = document.querySelector("#toastContainer");

        // Toast notification function
        const showToast = (message, type = "success") => {
            const toast = document.createElement("div");
            toast.classList.add("toast", type);
            
            let icon = '✅';
            if (type === 'error') icon = '❌';
            if (type === 'warning') icon = '⚠️';
            if (type === 'info') icon = 'ℹ️';
            
            toast.innerHTML = `
                <span class="toast-icon">${icon}</span>
                <span>${message}</span>
            `;
            
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add("hiding");
                setTimeout(() => toast.remove(), 400);
            }, 2500);
        };

        // Update statistics
        const updateStats = () => {
            totalEl.textContent = employees.length;
            
            if (employees.length) {
                const totalSalary = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0);
                const avg = Math.round(totalSalary / employees.length);
                avgEl.textContent = `KSh ${avg.toLocaleString()}`;
            } else {
                avgEl.textContent = 'KSh 0';
            }
        };

        // Format date from DD/MM/YYYY to YYYY-MM-DD
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
            return dateStr;
        };

        // Format date from YYYY-MM-DD to DD/MM/YYYY
        const formatDateForDisplay = (dateStr) => {
            if (!dateStr) return '';
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        };

        // Calculate age from DOB
        const calculateAge = (dob) => {
            if (!dob) return 0;
            
            let birthDate;
            if (dob.includes('/')) {
                const parts = dob.split('/');
                birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                birthDate = new Date(dob);
            }
            
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        };

        // Filter and sort employees
        const getFilteredAndSortedEmployees = () => {
            let filtered = [...employees];
            
            // Filter by search query
            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                filtered = filtered.filter(emp => 
                    (emp.firstName && emp.firstName.toLowerCase().includes(query)) ||
                    (emp.lastName && emp.lastName.toLowerCase().includes(query)) ||
                    (`${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query))
                );
            }
            
            // Sort
            const sortBy = sortSelect.value;
            filtered.sort((a, b) => {
                switch(sortBy) {
                    case 'name':
                        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
                    case 'nameDesc':
                        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
                    case 'salary':
                        return (a.salary || 0) - (b.salary || 0);
                    case 'salaryDesc':
                        return (b.salary || 0) - (a.salary || 0);
                    case 'age':
                        return (a.age || calculateAge(a.dob)) - (b.age || calculateAge(b.dob));
                    case 'ageDesc':
                        return (b.age || calculateAge(b.dob)) - (a.age || calculateAge(a.dob));
                    default:
                        return 0;
                }
            });
            
            return filtered;
        };

        // Render employee list
        const renderList = (filteredEmployees) => {
            if (!filteredEmployees || filteredEmployees.length === 0) {
                listContainer.innerHTML = `
                    <div class="no-results">
                        <div class="no-results-icon">🔍</div>
                        <div class="no-results-text">No employees found</div>
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = filteredEmployees.map(emp => `
                <div class="emp-item ${emp.id === selectedId ? 'selected' : ''}" data-id="${emp.id}">
                    <div class="emp-item-name">
                        <img src="${emp.imageUrl || `https://i.pravatar.cc/150?img=${emp.id % 70}`}" 
                             alt="${emp.firstName}" 
                             class="emp-item-avatar"
                             onerror="this.src='https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}'">
                        <span>${emp.firstName} ${emp.lastName || ''}</span>
                    </div>
                    <div class="emp-item-actions">
                        <span class="emp-edit" onclick="event.stopPropagation(); openEditModal(${emp.id})">✏️</span>
                        <span class="emp-delete" onclick="event.stopPropagation(); deleteEmployee(${emp.id})">🗑️</span>
                    </div>
                </div>
            `).join('');
        };

        // Render employee detail
        const renderDetail = () => {
            if (!selectedId) {
                detailContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <div class="empty-state-text">Select an employee to view details</div>
                    </div>
                `;
                return;
            }
            
            const emp = employees.find(e => e.id === selectedId);
            if (!emp) {
                selectedId = employees[0]?.id || null;
                return renderDetail();
            }
            
            const age = emp.age || calculateAge(emp.dob);
            const fullName = `${emp.firstName} ${emp.lastName || ''}`;
            
            detailContainer.innerHTML = `
                <img src="${emp.imageUrl || `https://i.pravatar.cc/150?img=${emp.id % 70}`}" 
                     alt="${fullName}"
                     onerror="this.src='https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}'">
                <span class="emp-name">${fullName}</span>
                <span class="emp-email">📧 ${emp.email || 'N/A'}</span>
                <span class="emp-contact">📞 ${emp.contactNumber || 'N/A'}</span>
                <span class="emp-address">📍 ${emp.address || 'N/A'}</span>
                <span class="emp-dob">🎂 ${emp.dob || 'N/A'} (${age} years)</span>
                <span class="emp-salary">💰 KSh ${(emp.salary || 0).toLocaleString()}</span>
                <div class="emp-detail-actions">
                    <button class="edit-detail-btn" onclick="openEditModal(${emp.id})">✏️ Edit Employee</button>
                    <button class="delete-detail-btn" onclick="deleteEmployee(${emp.id})">🗑️ Delete Employee</button>
                </div>
            `;
        };

        // Main render function
        const render = () => {
            const filtered = getFilteredAndSortedEmployees();
            
            // Update selected ID if it's no longer in filtered list
            if (!filtered.find(e => e.id === selectedId)) {
                selectedId = filtered[0]?.id || null;
            }
            
            renderList(filtered);
            renderDetail();
            updateStats();
        };

        // Add employee
        const addEmployee = (e) => {
            e.preventDefault();
            
            const formData = new FormData(addForm);
            const dob = formData.get('dob');
            
            const newEmployee = {
                id: Math.max(...employees.map(e => e.id), 1000) + 1,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                contactNumber: formData.get('contactNumber'),
                salary: parseFloat(formData.get('salary')),
                dob: formatDateForDisplay(dob),
                age: calculateAge(dob),
                address: formData.get('address'),
                imageUrl: formData.get('imageUrl') || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
            };
            
            employees.push(newEmployee);
            selectedId = newEmployee.id;
            
            render();
            showToast(`${newEmployee.firstName} ${newEmployee.lastName} added successfully!`, 'success');
            
            addModal.style.display = "none";
            addForm.reset();
        };

        // Open edit modal
        window.openEditModal = (id) => {
            const emp = employees.find(x => x.id === id);
            if (!emp) return;
            
            document.querySelector("#editId").value = emp.id;
            document.querySelector("#editFirstName").value = emp.firstName || '';
            document.querySelector("#editLastName").value = emp.lastName || '';
            document.querySelector("#editEmail").value = emp.email || '';
            document.querySelector("#editContactNumber").value = emp.contactNumber || '';
            document.querySelector("#editSalary").value = emp.salary || '';
            document.querySelector("#editAddress").value = emp.address || '';
            document.querySelector("#editImageUrl").value = emp.imageUrl || '';
            document.querySelector("#editDob").value = formatDateForInput(emp.dob) || '';
            
            editModal.style.display = "flex";
        };

        // Update employee
        const updateEmployee = (e) => {
            e.preventDefault();
            
            const id = parseInt(document.querySelector("#editId").value);
            const index = employees.findIndex(x => x.id === id);
            
            if (index === -1) return;
            
            const dob = document.querySelector("#editDob").value;
            
            employees[index] = {
                ...employees[index],
                firstName: document.querySelector("#editFirstName").value,
                lastName: document.querySelector("#editLastName").value,
                email: document.querySelector("#editEmail").value,
                contactNumber: document.querySelector("#editContactNumber").value,
                salary: parseFloat(document.querySelector("#editSalary").value),
                address: document.querySelector("#editAddress").value,
                imageUrl: document.querySelector("#editImageUrl").value || employees[index].imageUrl,
                dob: formatDateForDisplay(dob),
                age: calculateAge(dob)
            };
            
            render();
            showToast(`Employee updated successfully!`, 'success');
            
            editModal.style.display = "none";
            editForm.reset();
        };

        // Delete employee
        window.deleteEmployee = (id) => {
            if (!confirm("Are you sure you want to delete this employee?")) return;
            
            const emp = employees.find(e => e.id === id);
            employees = employees.filter(e => e.id !== id);
            
            if (selectedId === id) {
                selectedId = employees[0]?.id || null;
            }
            
            render();
            showToast(`${emp.firstName} ${emp.lastName} has been deleted`, 'warning');
        };

        // Event Listeners
        addForm.addEventListener("submit", addEmployee);
        editForm.addEventListener("submit", updateEmployee);
        
        addBtn.addEventListener("click", () => {
            addModal.style.display = "flex";
        });
        
        cancelAddBtn.addEventListener("click", () => {
            addModal.style.display = "none";
            addForm.reset();
        });
        
        cancelEditBtn.addEventListener("click", () => {
            editModal.style.display = "none";
            editForm.reset();
        });
        
        // Close modals when clicking outside
        addModal.addEventListener("click", (e) => {
            if (e.target === addModal) {
                addModal.style.display = "none";
                addForm.reset();
            }
        });
        
        editModal.addEventListener("click", (e) => {
            if (e.target === editModal) {
                editModal.style.display = "none";
                editForm.reset();
            }
        });
        
        // Employee list item click
        listContainer.addEventListener("click", (e) => {
            const item = e.target.closest('.emp-item');
            if (!item) return;
            
            const id = parseInt(item.dataset.id);
            if (!isNaN(id) && id !== selectedId) {
                selectedId = id;
                render();
            }
        });
        
        // Search and sort events
        searchInput.addEventListener("input", render);
        sortSelect.addEventListener("change", render);

        // Initialize
        render();
        
        // Make functions available globally
        window.openEditModal = openEditModal;
        window.deleteEmployee = deleteEmployee;
        
    } catch (error) {
        console.error("Error loading employees:", error);
        document.querySelector(".emp-list-items").innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div class="empty-state-text">Error loading employee data</div>
            </div>
        `;
    }
})();